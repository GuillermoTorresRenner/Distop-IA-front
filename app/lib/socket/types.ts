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
 *  - `system`: mensaje automático del sistema (ej. activación de disciplina).
 */
export interface ChatSpeaker {
  kind: "self" | "character" | "system";
  name: string;
  characterId: string | null;
  /**
   * URL relativa del retrato a mostrar junto al mensaje:
   *  - `self`: avatar del usuario (de `users/avatars/`).
   *  - `character`: retrato del personaje (de `characters/avatars/`).
   *  - `system`: siempre `null` (mensaje del sistema, sin retrato).
   * El backend ya hace el enrichment, así que el cliente puede pasarla
   * directo por `resolveImageUrl()` y ponerla en un `<img>`.
   */
  avatar?: string | null;
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
  /**
   * URL relativa del retrato (servida via NPM `/images` o vite proxy en dev).
   * `null` si no se subió uno. El backend ya hace el enrichment.
   */
  avatar?: string | null;
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
  /** Nivel declarado de la habilidad al momento de la tirada (1..5) o null. */
  skillRating: number | null;
  /** Snapshot del texto de la especialidad usada (markdown). Null si la
   * tirada no usó especialidad o si el cliente no envió el texto. */
  specialtyText: string | null;
  /** Compatibilidad: true si se gastó voluntad por cualquier motivo. */
  willpowerSpent: boolean;
  /** Efecto legacy: solo refleja éxito/heridas (no reroll). */
  willpowerEffect: WillpowerEffect;
  /** Flags exactos de la voluntad gastada (fuente de verdad). */
  wpForSuccess: boolean;
  wpForWound: boolean;
  wpForReroll: boolean;
  /** Penalizador por heridas (negativo o 0). Se persiste aunque se haya anulado. */
  woundPenalty: number;
  /** Tirada del pool inicial. */
  rolls: number[];
  /** Dados extras de la regla de especialidad (cada 10 detona uno). */
  specialtyRerolls: number[];
  /** Dados extras del reroll de voluntad (fallos del pool inicial). */
  willpowerRerolls: number[];
  successes: number;
  isBotch: boolean;
  isPublic: boolean;
  /** Origen de la tirada (ej. "DISCIPLINE", "INITIATIVE"). Null para tiradas manuales. */
  sourceKind?: string | null;
  /** Etiqueta legible del origen (ej. nombre de la disciplina). */
  sourceName?: string | null;
  /**
   * Payload extra dependiente de `sourceKind`.
   * Para `INITIATIVE`: `{ d10, dexterity, wits, total }`.
   */
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface RollInitiativeInput {
  characterId: string;
  /** Etiqueta opcional (ej. "Asalto sorpresa"). */
  label?: string;
  /** Default true. */
  isPublic?: boolean;
  /**
   * Modificador circunstancial entero (positivo o negativo). Se suma al
   * total junto con Destreza y Astucia. Rango [-20, +20].
   */
  modifier?: number;
}

/**
 * Tirada de un poder o ritual. El servidor lee el catálogo, valida que
 * el personaje lo conoce al nivel requerido, calcula el pool desde sus
 * stats (atributo + habilidad + modifier) y tira con la dificultad
 * declarada en el catálogo. Exactamente uno de `powerId` o `ritualId`.
 */
export interface RollPowerInput {
  characterId: string;
  powerId?: string;
  ritualId?: string;
  label?: string;
  /** Modificador al pool. Rango [-10, +10]. */
  modifier?: number;
  isPublic?: boolean;
}

export interface RollVtmInput {
  pool: number;
  difficulty?: number;
  specialty?: boolean;
  /** Nivel de la habilidad (1..5). Obligatorio si specialty=true. */
  skillRating?: number;
  /** Texto (markdown) de la especialidad activa al momento de la tirada. */
  specialtyText?: string;
  /** +1 éxito automático, no removible por 1s. */
  willpowerForSuccess?: boolean;
  /** Anula el penalizador por heridas en esta tirada. */
  willpowerForWound?: boolean;
  /** Relanza todos los dados que no fueron éxito una sola vez. */
  willpowerForReroll?: boolean;
  /** Penalizador por heridas calculado por el cliente (negativo o 0). */
  woundPenalty?: number;
  isPublic?: boolean;
  label?: string;
  characterId?: string;
  /** Origen (ej. "DISCIPLINE"). */
  sourceKind?: string;
  /** Etiqueta legible del origen (nombre de la disciplina, etc.). */
  sourceName?: string;
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
  "roll:initiative": (
    body: RollInitiativeInput,
    ack?: (resp: { ok: boolean; id?: string; error?: string }) => void
  ) => void;
  "roll:power": (
    body: RollPowerInput,
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
  /** Activa un poder de disciplina del personaje (descuenta sangre + anuncia). */
  "discipline:activate": (
    body: { characterId: string; powerId: string },
    ack?: (resp: {
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
    }) => void
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
