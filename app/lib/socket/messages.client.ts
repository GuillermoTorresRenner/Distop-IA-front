import { io, type Socket } from "socket.io-client";
import type { DirectMessage } from "~/lib/api/messages/messages.types";

interface SendBody {
  recipientId: string;
  body: string;
}

interface ReadBody {
  peerId: string;
}

interface DeleteBody {
  messageId: string;
}

export interface MessagesServerToClient {
  /** Mensaje nuevo (lo reciben ambos lados del DM). */
  "dm:message": (msg: DirectMessage) => void;
  /** Mensaje soft-deleted: body vacío + deleted=true. */
  "dm:deleted": (msg: DirectMessage) => void;
  /** El peer leyó los mensajes indicados. `peerId` es quien leyó. */
  "dm:read": (payload: { peerId: string; readIds: string[]; at: string }) => void;
  /** Conteo global de no leídos del viewer; útil para el badge del navbar. */
  "dm:unread": (payload: { count: number }) => void;
  error: (payload: { message: string }) => void;
}

export interface MessagesClientToServer {
  "dm:send": (
    body: SendBody,
    ack?: (resp: { ok: boolean; message?: DirectMessage; error?: string }) => void,
  ) => void;
  "dm:delete": (
    body: DeleteBody,
    ack?: (resp: { ok: boolean; message?: DirectMessage; error?: string }) => void,
  ) => void;
  "dm:read": (
    body: ReadBody,
    ack?: (resp: {
      ok: boolean;
      readIds?: string[];
      at?: string;
      error?: string;
    }) => void,
  ) => void;
}

export type MessagesSocket = Socket<
  MessagesServerToClient,
  MessagesClientToServer
>;

function getSocketOrigin(): string {
  const apiUrl =
    (import.meta as unknown as { env?: Record<string, string | undefined> })
      .env?.VITE_API_URL ?? "http://localhost:3000/api";
  try {
    const u = new URL(apiUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "http://localhost:3000";
  }
}

let singleton: MessagesSocket | null = null;

export function getMessagesSocket(): MessagesSocket {
  // En SSR no debe crearse el socket: devolver lo que sea no rompe nada
  // porque los efectos que invocan este getter solo corren en cliente; pero
  // un consumidor con bug podría llamarlo en render. Falla seguro:
  if (typeof window === "undefined") {
    throw new Error("getMessagesSocket() can only be called in the browser");
  }
  if (singleton && singleton.connected) return singleton;
  if (singleton) {
    singleton.connect();
    return singleton;
  }
  singleton = io(`${getSocketOrigin()}/messages`, {
    withCredentials: true,
    autoConnect: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  }) as MessagesSocket;
  return singleton;
}

export function disconnectMessagesSocket() {
  if (singleton) {
    singleton.disconnect();
    singleton = null;
  }
}
