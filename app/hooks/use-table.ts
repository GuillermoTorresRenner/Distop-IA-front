import { useCallback, useEffect, useRef, useState } from "react";
import {
  disposeTableSocket,
  getTableSocket,
  type TableSocket,
} from "~/lib/socket/table.client";
import type {
  ChatMessage,
  ChronicleMemberRole,
  PresenceMember,
} from "~/lib/socket/types";

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
  messages: ChatMessage[];
}

const MAX_MESSAGES = 200;

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
    messages: [],
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
        messages: [...s.messages.slice(-MAX_MESSAGES + 1), msg],
      }));
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("error", onError);
    socket.on("presence:join", onPresenceJoin);
    socket.on("presence:leave", onPresenceLeave);
    socket.on("chat:message", onChatMessage);

    // Si ya estaba conectado (singleton reusado), disparamos join manualmente.
    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("error", onError);
      socket.off("presence:join", onPresenceJoin);
      socket.off("presence:leave", onPresenceLeave);
      socket.off("chat:message", onChatMessage);
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

  const dispose = useCallback(() => {
    disposeTableSocket();
    socketRef.current = null;
  }, []);

  return {
    ...state,
    sendMessage,
    dispose,
  };
}
