import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteDirectMessage,
  getUnreadCount,
  listConversations,
  listMessagesWith,
  markConversationRead,
} from "~/lib/api/messages/messages.api";
import type {
  Conversation,
  DirectMessage,
} from "~/lib/api/messages/messages.types";
import {
  getMessagesSocket,
  type MessagesSocket,
} from "~/lib/socket/messages.client";

interface UseMessages {
  /** Socket conectado (singleton). Null en SSR antes del primer effect. */
  socket: MessagesSocket | null;
  /** Conversaciones del usuario, orden DESC por último mensaje. */
  conversations: Conversation[];
  /** Conteo global de no leídos (para el badge del navbar). */
  unread: number;
  /** Refresca la lista de conversaciones (REST). */
  refreshConversations: () => Promise<void>;
  /** Carga el histórico con un peer y reemplaza el estado de la conversación abierta. */
  loadConversation: (peerId: string) => Promise<DirectMessage[]>;
  /** Envía un mensaje vía WS. */
  send: (recipientId: string, body: string) => Promise<DirectMessage | null>;
  /** Borra un mensaje propio (soft delete) vía WS. */
  remove: (messageId: string) => Promise<DirectMessage | null>;
  /** Marca como leídos los mensajes recibidos desde un peer. */
  markRead: (peerId: string) => Promise<void>;
  /** Mensajes en vivo recibidos desde que se montó el hook. */
  liveMessages: DirectMessage[];
  /** Vacía el buffer en vivo (usar tras pintarlos). */
  consumeLive: () => DirectMessage[];
}

/**
 * Hook compartido para la mensajería directa. Mantiene:
 *  - el socket abierto mientras el componente está montado,
 *  - el feed de conversaciones,
 *  - el contador global de unread (sincronizado por WS y al hacer markRead).
 *
 * No mantiene el histórico abierto: ese estado lo gestiona la vista de chat.
 */
export function useMessages(): UseMessages {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unread, setUnread] = useState(0);
  const liveBufferRef = useRef<DirectMessage[]>([]);
  const [liveTick, setLiveTick] = useState(0);
  const socketRef = useRef<MessagesSocket | null>(null);

  const refreshConversations = useCallback(async () => {
    try {
      const list = await listConversations();
      setConversations(list);
    } catch {
      // si falla, dejamos la lista como esté
    }
  }, []);

  useEffect(() => {
    // Carga inicial vía REST.
    void refreshConversations();
    void getUnreadCount()
      .then(({ count }) => setUnread(count))
      .catch(() => undefined);

    // Conexión WS.
    const socket = getMessagesSocket();
    socketRef.current = socket;

    const onMessage = (msg: DirectMessage) => {
      liveBufferRef.current.push(msg);
      setLiveTick((t) => t + 1);
      // Refrescamos la lista para actualizar lastMessage + unread por peer.
      void refreshConversations();
    };
    const onDeleted = (msg: DirectMessage) => {
      liveBufferRef.current.push(msg);
      setLiveTick((t) => t + 1);
      void refreshConversations();
    };
    const onRead = () => {
      void refreshConversations();
    };
    const onUnread = (payload: { count: number }) => {
      setUnread(payload.count);
    };

    socket.on("dm:message", onMessage);
    socket.on("dm:deleted", onDeleted);
    socket.on("dm:read", onRead);
    socket.on("dm:unread", onUnread);

    return () => {
      socket.off("dm:message", onMessage);
      socket.off("dm:deleted", onDeleted);
      socket.off("dm:read", onRead);
      socket.off("dm:unread", onUnread);
    };
  }, [refreshConversations]);

  const loadConversation = useCallback(async (peerId: string) => {
    return listMessagesWith(peerId);
  }, []);

  const send = useCallback(
    async (recipientId: string, body: string) => {
      const socket = socketRef.current ?? getMessagesSocket();
      return new Promise<DirectMessage | null>((resolve) => {
        socket.emit("dm:send", { recipientId, body }, (resp) => {
          if (resp?.ok && resp.message) {
            resolve(resp.message);
          } else {
            resolve(null);
          }
        });
      });
    },
    [],
  );

  const remove = useCallback(async (messageId: string) => {
    const socket = socketRef.current ?? getMessagesSocket();
    // Intentamos por WS primero; si la sala no respondió, fallback REST.
    return new Promise<DirectMessage | null>((resolve) => {
      let settled = false;
      const timer = setTimeout(async () => {
        if (settled) return;
        settled = true;
        try {
          const msg = await deleteDirectMessage(messageId);
          resolve(msg);
        } catch {
          resolve(null);
        }
      }, 1500);
      socket.emit("dm:delete", { messageId }, (resp) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(resp?.ok && resp.message ? resp.message : null);
      });
    });
  }, []);

  const markRead = useCallback(async (peerId: string) => {
    const socket = socketRef.current ?? getMessagesSocket();
    return new Promise<void>((resolve) => {
      let settled = false;
      const timer = setTimeout(async () => {
        if (settled) return;
        settled = true;
        try {
          await markConversationRead(peerId);
        } catch {
          // ignore
        }
        resolve();
      }, 1500);
      socket.emit("dm:read", { peerId }, () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      });
    });
  }, []);

  const consumeLive = useCallback(() => {
    const buf = liveBufferRef.current;
    liveBufferRef.current = [];
    return buf;
  }, []);

  // El liveTick fuerza re-render para que los consumers re-lean liveBufferRef.
  void liveTick;

  return {
    socket: socketRef.current,
    conversations,
    unread,
    refreshConversations,
    loadConversation,
    send,
    remove,
    markRead,
    liveMessages: liveBufferRef.current,
    consumeLive,
  };
}
