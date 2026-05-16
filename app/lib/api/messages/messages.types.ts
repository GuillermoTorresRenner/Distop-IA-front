import type { UserSummary } from "~/lib/api/users/users.types";

/** Mensaje directo entre dos amigos. */
export interface DirectMessage {
  id: string;
  senderId: string;
  recipientId: string;
  /** Markdown. Vacío si está borrado. */
  body: string;
  /** Marcado como eliminado por el autor. El cliente muestra "mensaje eliminado". */
  deleted: boolean;
  /** ISO date string. Null = aún no leído por el destinatario. */
  readAt: string | null;
  createdAt: string;
  sender: UserSummary;
  recipient: UserSummary;
}

/** Resumen de una conversación con un amigo (entrada de la lista). */
export interface Conversation {
  peer: UserSummary;
  lastMessage: {
    id: string;
    body: string;
    deleted: boolean;
    fromMe: boolean;
    createdAt: string;
  } | null;
  unreadCount: number;
}
