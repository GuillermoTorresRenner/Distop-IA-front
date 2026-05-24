/**
 * Vista del combate. Tipos espejo de `back/src/table/combat.service.ts`.
 * El back filtra el contenido según el rol del usuario:
 *  - Narrador: ve todo (iniciativas, NPC/Antagonist, entradas libres, mooks).
 *  - Jugador: solo participantes PC, sin iniciativa, sin ownerId.
 */
export type CombatParticipantKind =
  | "PC"
  | "NPC"
  | "ANTAGONIST"
  | "FREE"
  | "MOOK";

/** Casillas de salud V20 marcadas (0..max por nivel). */
export interface MookHealth {
  bruised: number;
  hurt: number;
  injured: number;
  wounded: number;
  mauled: number;
  crippled: number;
  incapacitated: number;
}

export interface CombatParticipant {
  id: string;
  characterId: string | null;
  name: string;
  /** Solo presente para narrador. */
  initiative?: number | null;
  order: number;
  kind: CombatParticipantKind;
  /** Solo presente para narrador. */
  ownerId?: string | null;
  /** Mook (copia de antagonista): plantilla y stats embebidos, solo narrador. */
  sourceCharacterId?: string | null;
  sourceCharacterName?: string | null;
  dexterity?: number | null;
  wits?: number | null;
  health?: MookHealth;
}

export interface CombatState {
  chronicleId: string;
  /**
   * Índice del turno activo en `participants`. Para jugadores puede ser -1
   * cuando el turno actual es de un NPC/Antagonist/FREE (oculto), en cuyo
   * caso el front muestra "Turno del narrador".
   */
  cursor: number;
  round: number;
  participants: CombatParticipant[];
  /** Solo presente para narrador. Total real incluyendo ocultos para el jugador. */
  totalParticipants?: number;
}

export interface AddParticipantInput {
  characterId?: string | null;
  displayName?: string | null;
  initiative?: number | null;
}

export interface UpdateParticipantInput {
  initiative?: number | null;
  displayName?: string | null;
}

export interface CloneAntagonistInput {
  sourceCharacterId: string;
  count: number;
  baseName?: string;
}

export type UpdateMookHealthInput = Partial<MookHealth>;

export interface RollMookInitiativeResponse {
  state: CombatState;
  roll: {
    d10: number;
    dexterity: number;
    wits: number;
    total: number;
    mookName: string;
  };
}
