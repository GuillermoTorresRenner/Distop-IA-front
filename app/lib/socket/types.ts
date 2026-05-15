/**
 * Tipos compartidos con el back (back/src/table/*).
 * Si cambian allá, actualizar acá.
 */

export type ChronicleMemberRole = "NARRATOR" | "PLAYER";

export interface PresenceMember {
  id: string;
  email: string;
  nickname: string | null;
  avatar: string | null;
  role: ChronicleMemberRole | string | null;
}

export type ChatRecipientKind = "all" | "narrator" | "user";

export interface ChatRecipient {
  kind: ChatRecipientKind;
  /** userId del destinatario si kind === "user". */
  userId: string | null;
}

/**
 * Identidad del hablante resuelta por el server:
 *  - `self`: el usuario habla como tal (con su nickname).
 *  - `character`: el usuario habla como un PJ suyo asociado a la crónica.
 */
export interface ChatSpeaker {
  kind: "self" | "character";
  name: string;
  characterId: string | null;
}

/**
 * Identidad enviada por el cliente. El server resuelve el nombre y valida
 * la propiedad del PJ; el cliente nunca decide el `name` mostrado.
 */
export interface ChatSpeakerInput {
  kind: "self" | "character";
  characterId?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  email: string;
  /** Identidad mostrada en el chat. Si no viene (mensajes legacy), caer al email. */
  speaker?: ChatSpeaker;
  text: string;
  at: string; // ISO
  /** Sentido a quién va el mensaje. Si no viene, asumir "all". */
  recipient?: ChatRecipient;
}

export interface ChatMessageInput {
  text: string;
  recipient?: ChatRecipient;
  /** Identidad bajo la que se envía (default: self). */
  as?: ChatSpeakerInput;
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
  /** kind del personaje al momento de la tirada — útil para mostrar etiquetas. */
  kind?: "PC" | "NPC" | "ANTAGONIST";
}

/** Efecto de la Voluntad gastada en una tirada V20. */
export type WillpowerEffect = "NONE" | "SUCCESS" | "WOUND" | "BOTH";

export interface DiceRoll {
  id: string;
  chronicleId: string;
  userId: string;
  user: DiceRollUser;
  characterId: string | null;
  character: DiceRollCharacter | null;
  label: string | null;
  /** Pool efectivo: ya descontó heridas (si no se anularon con Voluntad). */
  pool: number;
  difficulty: number;
  specialty: boolean;
  /** Compatibilidad: true si se gastó voluntad por cualquier motivo. */
  willpowerSpent: boolean;
  /** Efecto exacto de la voluntad gastada. */
  willpowerEffect: WillpowerEffect;
  /** Penalizador por heridas (negativo o 0). Se persiste aunque se haya anulado. */
  woundPenalty: number;
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
  /** +1 éxito automático, no removible por 1s. */
  willpowerForSuccess?: boolean;
  /** Anula el penalizador por heridas en esta tirada. */
  willpowerForWound?: boolean;
  /** Penalizador por heridas calculado por el cliente (negativo o 0). */
  woundPenalty?: number;
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
  /** Mapping fileId → { url, mimeType } de las imágenes embebidas. */
  fileRefs: Record<string, { url: string; mimeType: string }>;
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
    body: ChatMessageInput,
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
  /**
   * Snapshot completo del tracker de turnos. Cada cliente recibe la versión
   * adecuada a su rol: narrador ve iniciativas y NPCs/Antagonists, jugador
   * solo PCs.
   */
  "combat:state": (state: import("~/lib/api/combat/combat.types").CombatState) => void;
  error: (payload: { message: string }) => void;
}
