/**
 * Tipos compartidos con el back (back/src/table/*).
 * Si cambian allá, actualizar acá.
 */

export type ChronicleMemberRole = "NARRATOR" | "PLAYER";

export interface PresenceMember {
  id: string;
  email: string;
  avatar: string | null;
  role: ChronicleMemberRole | string | null;
}

export interface ChatMessage {
  id: string;
  userId: string;
  email: string;
  text: string;
  at: string; // ISO
}

// ── Eventos cliente → servidor ────────────────────────────────
export interface ClientToServerEvents {
  "table:join": (
    body: { chronicleId: string },
    ack?: (resp: {
      ok: boolean;
      members?: PresenceMember[];
      role?: ChronicleMemberRole | string;
      error?: string;
    }) => void
  ) => void;
  "table:leave": (
    body: Record<string, never>,
    ack?: (resp: { ok: boolean }) => void
  ) => void;
  "chat:message": (
    body: { text: string },
    ack?: (resp: { ok: boolean; id?: string; error?: string }) => void
  ) => void;
}

// ── Eventos servidor → cliente ────────────────────────────────
export interface ServerToClientEvents {
  "presence:join": (payload: { member: PresenceMember }) => void;
  "presence:leave": (payload: { userId: string }) => void;
  "chat:message": (msg: ChatMessage) => void;
  error: (payload: { message: string }) => void;
}
