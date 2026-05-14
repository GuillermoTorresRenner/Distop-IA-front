import { useCallback, useEffect, useRef, useState } from "react";
import {
  disposeTableSocket,
  getTableSocket,
  type TableSocket,
} from "~/lib/socket/table.client";
import type {
  ChatMessage,
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
  });

  const socketRef = useRef<TableSocket | null>(null);

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
    };

    const onRollsCleared = () => {
      setState((s) => ({ ...s, rolls: [], latestRollId: null }));
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
      socket.emit("table:leave", {});
    };
  }, [chronicleId]);

  // ── desmonte total: si el componente se va, soltamos el singleton ──
  useEffect(() => {
    return () => {
      // No desconectamos automáticamente: el singleton puede ser reusado
      // por otra ruta. La limpieza explícita la hace dispose() abajo.
    };
  }, []);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return Promise.resolve(false);
    const socket = socketRef.current;
    if (!socket || !socket.connected) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      socket.emit("chat:message", { text: trimmed }, (resp) => {
        resolve(Boolean(resp?.ok));
      });
    });
  }, []);

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

  const dismissLatestRoll = useCallback(() => {
    setState((s) =>
      s.latestRollId ? { ...s, latestRollId: null } : s
    );
  }, []);

  const dispose = useCallback(() => {
    disposeTableSocket();
    socketRef.current = null;
  }, []);

  return {
    ...state,
    sendMessage,
    rollVtm,
    announceSheet,
    setInitialRolls,
    dismissLatestRoll,
    dispose,
  };
}
