/**
 * Vista del combate. Tipos espejo de `back/src/table/combat.service.ts`.
 * El back filtra el contenido según el rol del usuario:
 *  - Narrador: ve todo (iniciativas, NPC/Antagonist, entradas libres).
 *  - Jugador: solo participantes PC, sin iniciativa, sin ownerId.
 */
export type CombatParticipantKind = "PC" | "NPC" | "ANTAGONIST" | "FREE";

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
