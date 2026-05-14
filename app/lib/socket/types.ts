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

export interface DiceRollUser {
  id: string;
  email: string;
  nickname: string;
  avatar: string | null;
}

export interface DiceRollCharacter {
  id: string;
  name: string;
}

export interface DiceRoll {
  id: string;
  chronicleId: string;
  userId: string;
  user: DiceRollUser;
  characterId: string | null;
  character: DiceRollCharacter | null;
  label: string | null;
  pool: number;
  difficulty: number;
  specialty: boolean;
  willpowerSpent: boolean;
  rolls: number[];
  successes: number;
  isBotch: boolean;
  isPublic: boolean;
  createdAt: string;
}

export interface RollVtmInput {
  pool: number;
  difficulty?: number;
  specialty?: boolean;
  willpowerSpent?: boolean;
  isPublic?: boolean;
  label?: string;
  characterId?: string;
}

export interface SheetDeltaEntry {
  label: string;
  before: string;
  after: string;
}

export interface SheetAnnounceInput {
  characterId: string;
  deltas: SheetDeltaEntry[];
}

export interface BoardShareInput {
  isShared: boolean;
}

export interface BoardUpdateInput {
  elements: unknown[];
  appState?: Record<string, unknown>;
}

export interface BoardSharedPayload {
  chronicleId: string;
  isShared: boolean;
  elements: unknown[];
  appState: Record<string, unknown> | null;
  at: string;
}

export interface BoardUpdatedPayload {
  chronicleId: string;
  elements: unknown[];
  appState: Record<string, unknown> | null;
  at: string;
}

export interface SheetAnnounce {
  id: string;
  characterId: string;
  characterName: string;
  kind: "PC" | "NPC" | "ANTAGONIST";
  authorId: string;
  deltas: SheetDeltaEntry[];
  at: string;
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
  "roll:vtm": (
    body: RollVtmInput,
    ack?: (resp: { ok: boolean; id?: string; error?: string }) => void
  ) => void;
  "sheet:announce": (
    body: SheetAnnounceInput,
    ack?: (resp: { ok: boolean; error?: string }) => void
  ) => void;
  "board:share": (
    body: BoardShareInput,
    ack?: (resp: { ok: boolean; isShared?: boolean; error?: string }) => void
  ) => void;
  "board:update": (
    body: BoardUpdateInput,
    ack?: (resp: { ok: boolean; broadcasted?: boolean; error?: string }) => void
  ) => void;
}

// ── Eventos servidor → cliente ────────────────────────────────
export interface ServerToClientEvents {
  "presence:join": (payload: { member: PresenceMember }) => void;
  "presence:leave": (payload: { userId: string }) => void;
  "chat:message": (msg: ChatMessage) => void;
  "roll:result": (roll: DiceRoll) => void;
  "rolls:cleared": (payload: {
    chronicleId: string;
    by: { userId: string };
    at: string;
  }) => void;
  "sheet:announce": (announce: SheetAnnounce) => void;
  "board:shared": (payload: BoardSharedPayload) => void;
  "board:updated": (payload: BoardUpdatedPayload) => void;
  error: (payload: { message: string }) => void;
}
