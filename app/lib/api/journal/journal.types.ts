import type { UserSummary } from "~/lib/api/users/users.types";

export interface JournalEntryCharacterRef {
  id: string;
  name: string;
  kind: "PC" | "NPC" | "ANTAGONIST";
}

export interface JournalEntry {
  id: string;
  chronicleId: string;
  title: string;
  body: string;
  sessionDate: string | null;
  createdAt: string;
  updatedAt: string;
  author: UserSummary;
  /**
   * En entries de personaje, el PJ al que pertenece la nota. En entries de
   * crónica siempre es null. Puede ser null en entries de personaje viejas
   * creadas antes de la migración a `characterId`.
   */
  character: JournalEntryCharacterRef | null;
  /**
   * Solo presente en entries de personaje (CharacterJournalEntry).
   * true = visible en la bitácora de la crónica para todos los miembros.
   * null = es una entry de crónica (no aplica).
   */
  isShared?: boolean | null;
  /**
   * Discriminador inyectado por el back cuando la entry aparece mezclada
   * en la bitácora de la crónica. "CHRONICLE" = del narrador, "CHARACTER"
   * = de un jugador compartida.
   */
  entryKind?: "CHRONICLE" | "CHARACTER";
}

export type JournalEntryKind = "CHRONICLE" | "CHARACTER";

export interface JournalFeedEntry {
  id: string;
  kind: JournalEntryKind;
  chronicle: { id: string; name: string };
  title: string;
  body: string;
  sessionDate: string | null;
  createdAt: string;
  updatedAt: string;
  author: UserSummary;
  character: JournalEntryCharacterRef | null;
}

export interface MyJournalFeed {
  chronicle: JournalFeedEntry[];
  character: JournalFeedEntry[];
}

export interface JournalEntryInput {
  title: string;
  body: string;
  sessionDate?: string;
}

/**
 * Entries de personaje requieren un personaje del autor asociado a la crónica.
 * Es la única forma legal de crear una nota personal.
 */
export interface CharacterJournalEntryInput extends JournalEntryInput {
  characterId: string;
}
