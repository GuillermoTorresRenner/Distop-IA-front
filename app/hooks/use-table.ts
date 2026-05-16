import { useCallback, useEffect, useRef, useState } from "react";
import type { CombatState } from "~/lib/api/combat/combat.types";
import { playDiceRoll, playMessage } from "~/lib/audio/sounds.client";
import {
  disposeTableSocket,
  getTableSocket,
  type TableSocket,
} from "~/lib/socket/table.client";
import type {
  BoardSharedPayload,
  BoardUpdatedPayload,
  BoardUpdateInput,
  ChatMessage,
  ChatRecipient,
  ChatSpeakerInput,
  ChronicleMemberRole,
  DiceRoll,
  PresenceMember,
  RollVtmInput,
  SheetAnnounce,
  SheetAnnounceInput,
} from "~/lib/socket/types";

/**
 * Item unificado del feed del chat: mensaje humano o anuncio de hoja.
 * Usamos `_t` como discriminador para no colisionar con el `kind` del
 * personaje en `SheetAnnounce` (PC/NPC/ANTAGONIST).
 */
export type FeedItem =
  | ({ _t: "chat" } & ChatMessage)
  | ({ _t: "sheet" } & SheetAnnounce);

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "joined"
  | "error"
  | "disconnected";

interface UseTableState {
  status: ConnectionStatus;
  error: string | null;
  members: PresenceMember[];
  myRole: ChronicleMemberRole | string | null;
  /** Feed unificado del chat: mensajes humanos + anuncios de hoja. */
  feed: FeedItem[];
  rolls: DiceRoll[];
  /** id de la tirada recién recibida (para animación; se limpia automáticamente) */
  latestRollId: string | null;
  /** Estado de la pizarra compartida (lo emite el narrador). */
  boardShared: boolean;
  /** Snapshot recibido de la pizarra compartida cuando boardShared = true. */
  remoteBoard: {
    elements: unknown[];
    appState: Record<string, unknown> | null;
    fileRefs: Record<string, { url: string; mimeType: string }>;
  } | null;
  /** Token monotónico que cambia cada vez que llega un snapshot nuevo. */
  remoteBoardVersion: number;
  /**
   * Último snapshot del tracker de turnos. Llega filtrado según rol desde
   * el back. `null` si todavía no se cargó ni hubo broadcast.
   */
  combat: CombatState | null;
}

const MAX_FEED = 300;
const MAX_ROLLS = 100;

/**
 * Conecta a la mesa de una crónica. Se debe llamar SOLO en componentes que
 * corren en el browser (no en loaders SSR). Es seguro en useEffect.
 */
export function useTable(chronicleId: string | null) {
  const [state, setState] = useState<UseTableState>({
    status: "idle",
    error: null,
    members: [],
    myRole: null,
    feed: [],
    rolls: [],
    latestRollId: null,
    boardShared: false,
    remoteBoard: null,
    remoteBoardVersion: 0,
    combat: null,
  });

  const socketRef = useRef<TableSocket | null>(null);
  // Nonce manual para forzar reconexión preventiva: cada cambio dispara el
  // cleanup del effect (off de listeners + table:leave) y rearma todo con un
  // socket recién creado.
  const [reconnectNonce, setReconnectNonce] = useState(0);

  // ── conexión + listeners ──────────────────────────────────────
  useEffect(() => {
    if (!chronicleId) return;
    if (typeof window === "undefined") return; // safety SSR

    const socket = getTableSocket();
    socketRef.current = socket;

    setState((s) => ({ ...s, status: "connecting", error: null }));

    const onConnect = () => {
      setState((s) => ({ ...s, status: "connected", error: null }));
      socket.emit("table:join", { chronicleId }, (resp) => {
        if (!resp?.ok) {
          setState((s) => ({
            ...s,
            status: "error",
            error: resp?.error ?? "No se pudo entrar a la mesa",
          }));
          return;
        }
        setState((s) => ({
          ...s,
          status: "joined",
          members: resp.members ?? [],
          myRole: resp.role ?? null,
        }));
      });
    };

    const onDisconnect = () => {
      setState((s) => ({ ...s, status: "disconnected" }));
    };

    const onError = (payload: { message: string }) => {
      setState((s) => ({ ...s, status: "error", error: payload.message }));
    };

    const onPresenceJoin = (payload: { member: PresenceMember }) => {
      setState((s) => {
        if (s.members.some((m) => m.id === payload.member.id)) return s;
        return { ...s, members: [...s.members, payload.member] };
      });
    };

    const onPresenceLeave = (payload: { userId: string }) => {
      setState((s) => ({
        ...s,
        members: s.members.filter((m) => m.id !== payload.userId),
      }));
    };

    const onChatMessage = (msg: ChatMessage) => {
      setState((s) => ({
        ...s,
        feed: [...s.feed.slice(-MAX_FEED + 1), { _t: "chat", ...msg }],
      }));
      playMessage();
    };

    const onSheetAnnounce = (a: SheetAnnounce) => {
      setState((s) => ({
        ...s,
        feed: [...s.feed.slice(-MAX_FEED + 1), { _t: "sheet", ...a }],
      }));
    };

    const onRollResult = (roll: DiceRoll) => {
      setState((s) => ({
        ...s,
        // Orden ascendente (la más reciente abajo) para que coincida con el
        // chat y el comportamiento esperado por el usuario.
        rolls: [...s.rolls.slice(-(MAX_ROLLS - 1)), roll],
        latestRollId: roll.id,
      }));
      playDiceRoll(roll.rolls?.length ?? 5);
    };

    const onRollsCleared = () => {
      setState((s) => ({ ...s, rolls: [], latestRollId: null }));
    };

    const onBoardShared = (p: BoardSharedPayload) => {
      setState((s) => ({
        ...s,
        boardShared: p.isShared,
        remoteBoard: p.isShared
          ? {
              elements: p.elements,
              appState: p.appState,
              fileRefs: p.fileRefs ?? {},
            }
          : null,
        remoteBoardVersion: s.remoteBoardVersion + 1,
      }));
    };

    const onCombatState = (state: CombatState) => {
      setState((s) => ({ ...s, combat: state }));
    };

    const onBoardUpdated = (p: BoardUpdatedPayload) => {
      setState((s) => {
        if (!s.boardShared) return s;
        // Mantenemos los fileRefs del snapshot inicial (board:shared) porque
        // board:updated no los re-emite. Si aparece un fileId nuevo en los
        // elementos, el canvas refresca vía GET REST al detectarlo.
        const prevFileRefs = s.remoteBoard?.fileRefs ?? {};
        return {
          ...s,
          remoteBoard: {
            elements: p.elements,
            appState: p.appState,
            fileRefs: prevFileRefs,
          },
          remoteBoardVersion: s.remoteBoardVersion + 1,
        };
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("error", onError);
    socket.on("presence:join", onPresenceJoin);
    socket.on("presence:leave", onPresenceLeave);
    socket.on("chat:message", onChatMessage);
    socket.on("sheet:announce", onSheetAnnounce);
    socket.on("roll:result", onRollResult);
    socket.on("rolls:cleared", onRollsCleared);
    socket.on("board:shared", onBoardShared);
    socket.on("board:updated", onBoardUpdated);
    socket.on("combat:state", onCombatState);

    // Si ya estaba conectado (singleton reusado), disparamos join manualmente.
    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("error", onError);
      socket.off("presence:join", onPresenceJoin);
      socket.off("presence:leave", onPresenceLeave);
      socket.off("chat:message", onChatMessage);
      socket.off("sheet:announce", onSheetAnnounce);
      socket.off("roll:result", onRollResult);
      socket.off("rolls:cleared", onRollsCleared);
      socket.off("board:shared", onBoardShared);
      socket.off("board:updated", onBoardUpdated);
      socket.off("combat:state", onCombatState);
      socket.emit("table:leave", {});
    };
  }, [chronicleId, reconnectNonce]);

  // ── desmonte total: si el componente se va, soltamos el singleton ──
  useEffect(() => {
    return () => {
      // No desconectamos automáticamente: el singleton puede ser reusado
      // por otra ruta. La limpieza explícita la hace dispose() abajo.
    };
  }, []);

  const sendMessage = useCallback(
    (
      text: string,
      recipient?: ChatRecipient,
      as?: ChatSpeakerInput,
    ) => {
      const trimmed = text.trim();
      if (!trimmed) return Promise.resolve(false);
      const socket = socketRef.current;
      if (!socket || !socket.connected) return Promise.resolve(false);
      return new Promise<boolean>((resolve) => {
        socket.emit(
          "chat:message",
          { text: trimmed, recipient, as },
          (resp) => {
            resolve(Boolean(resp?.ok));
          }
        );
      });
    },
    []
  );

  const rollVtm = useCallback((input: RollVtmInput) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected)
      return Promise.resolve({ ok: false, error: "Sin conexión" });
    return new Promise<{ ok: boolean; id?: string; error?: string }>(
      (resolve) => {
        socket.emit("roll:vtm", input, (resp) => {
          resolve(resp ?? { ok: false, error: "Sin respuesta" });
        });
      }
    );
  }, []);

  const shareBoard = useCallback((isShared: boolean) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected)
      return Promise.resolve({ ok: false, error: "Sin conexión" });
    return new Promise<{
      ok: boolean;
      isShared?: boolean;
      error?: string;
    }>((resolve) => {
      socket.emit("board:share", { isShared }, (resp) => {
        resolve(resp ?? { ok: false });
      });
    });
  }, []);

  const pushBoardUpdate = useCallback((input: BoardUpdateInput) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected)
      return Promise.resolve({ ok: false, error: "Sin conexión" });
    return new Promise<{
      ok: boolean;
      broadcasted?: boolean;
      error?: string;
    }>((resolve) => {
      socket.emit("board:update", input, (resp) => {
        resolve(resp ?? { ok: false });
      });
    });
  }, []);

  const activateDiscipline = useCallback(
    (input: { characterId: string; powerId: string }) => {
      const socket = socketRef.current;
      if (!socket || !socket.connected)
        return Promise.resolve({ ok: false, error: "Sin conexión" });
      return new Promise<{
        ok: boolean;
        error?: string;
        power?: {
          id: string;
          name: string;
          level: number;
          description: string | null;
          summary: string | null;
          bloodCost: number;
          rollAttribute: string | null;
          rollAbility: string | null;
          rollDifficulty: number | null;
        };
        discipline?: { id: string; name: string };
        blood?: { before: number; after: number; spent: number };
      }>((resolve) => {
        socket.emit("discipline:activate", input, (resp) => {
          resolve(resp ?? { ok: false, error: "Sin respuesta" });
        });
      });
    },
    [],
  );

  const announceSheet = useCallback((input: SheetAnnounceInput) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected || input.deltas.length === 0) {
      return Promise.resolve({ ok: false });
    }
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      socket.emit("sheet:announce", input, (resp) => {
        resolve(resp ?? { ok: false });
      });
    });
  }, []);

  /** Para hidratar el historial inicial desde el endpoint REST. */
  const setInitialRolls = useCallback((rolls: DiceRoll[]) => {
    setState((s) => ({ ...s, rolls }));
  }, []);

  /** Para hidratar el tracker de turnos desde REST al montar. */
  const setCombat = useCallback((state: CombatState | null) => {
    setState((s) => ({ ...s, combat: state }));
  }, []);

  const dismissLatestRoll = useCallback(() => {
    setState((s) =>
      s.latestRollId ? { ...s, latestRollId: null } : s
    );
  }, []);

  const dispose = useCallback(() => {
    disposeTableSocket();
    socketRef.current = null;
  }, []);

  /**
   * Reconexión preventiva: bota el socket actual y dispara el effect para
   * crear uno nuevo (auth fresca, listeners limpios, rejoin a la sala).
   * Útil cuando el usuario percibe que la mesa "se durmió" — por proxy
   * inactivo, cambio de red, etc. — pero el badge aún dice connected.
   */
  const reconnect = useCallback(() => {
    setState((s) => ({ ...s, status: "connecting", error: null }));
    disposeTableSocket();
    socketRef.current = null;
    setReconnectNonce((n) => n + 1);
  }, []);

  return {
    ...state,
    sendMessage,
    rollVtm,
    announceSheet,
    activateDiscipline,
    shareBoard,
    pushBoardUpdate,
    setInitialRolls,
    setCombat,
    dismissLatestRoll,
    dispose,
    reconnect,
  };
}
