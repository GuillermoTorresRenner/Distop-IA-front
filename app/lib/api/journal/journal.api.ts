import { apiClient } from "~/lib/api/client";
import type {
  CharacterJournalEntryInput,
  JournalEntry,
  JournalEntryInput,
  MyJournalFeed,
} from "./journal.types";

export async function getMyJournal(): Promise<MyJournalFeed> {
  const { data } = await apiClient.get<MyJournalFeed>("/journal/me");
  return data;
}

export async function listChronicleJournal(
  chronicleId: string,
): Promise<JournalEntry[]> {
  const { data } = await apiClient.get<JournalEntry[]>(
    `/chronicles/${chronicleId}/journal`,
  );
  return data;
}

export async function createChronicleEntry(
  chronicleId: string,
  input: JournalEntryInput,
): Promise<JournalEntry> {
  const { data } = await apiClient.post<JournalEntry>(
    `/chronicles/${chronicleId}/journal`,
    input,
  );
  return data;
}

export async function updateChronicleEntry(
  chronicleId: string,
  entryId: string,
  input: Partial<JournalEntryInput>,
): Promise<JournalEntry> {
  const { data } = await apiClient.patch<JournalEntry>(
    `/chronicles/${chronicleId}/journal/${entryId}`,
    input,
  );
  return data;
}

export async function deleteChronicleEntry(
  chronicleId: string,
  entryId: string,
): Promise<{ ok: boolean }> {
  const { data } = await apiClient.delete<{ ok: boolean }>(
    `/chronicles/${chronicleId}/journal/${entryId}`,
  );
  return data;
}

export async function listCharacterJournal(
  chronicleId: string,
): Promise<JournalEntry[]> {
  const { data } = await apiClient.get<JournalEntry[]>(
    `/chronicles/${chronicleId}/character-journal`,
  );
  return data;
}

export async function createCharacterEntry(
  chronicleId: string,
  input: CharacterJournalEntryInput,
): Promise<JournalEntry> {
  const { data } = await apiClient.post<JournalEntry>(
    `/chronicles/${chronicleId}/character-journal`,
    input,
  );
  return data;
}

export async function updateCharacterEntry(
  chronicleId: string,
  entryId: string,
  input: Partial<CharacterJournalEntryInput>,
): Promise<JournalEntry> {
  const { data } = await apiClient.patch<JournalEntry>(
    `/chronicles/${chronicleId}/character-journal/${entryId}`,
    input,
  );
  return data;
}

export async function deleteCharacterEntry(
  chronicleId: string,
  entryId: string,
): Promise<{ ok: boolean }> {
  const { data } = await apiClient.delete<{ ok: boolean }>(
    `/chronicles/${chronicleId}/character-journal/${entryId}`,
  );
  return data;
}

/**
 * Activa o desactiva la visibilidad pública de una nota de personaje.
 * Cuando isShared=true aparece en la bitácora de la crónica para todos.
 */
export async function shareCharacterEntry(
  chronicleId: string,
  entryId: string,
  isShared: boolean,
): Promise<JournalEntry> {
  const { data } = await apiClient.patch<JournalEntry>(
    `/chronicles/${chronicleId}/character-journal/${entryId}/share`,
    { isShared },
  );
  return data;
}

/**
 * Sube una imagen al back para insertarla en una nota de bitácora.
 * Devuelve la URL relativa servida via NPM `/images`.
 */
export async function uploadJournalImage(
  chronicleId: string,
  file: File,
): Promise<{ url: string; mimeType: string }> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<{ url: string; mimeType: string }>(
    `/chronicles/${chronicleId}/journal/files`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}
