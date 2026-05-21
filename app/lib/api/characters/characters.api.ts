import { apiClient } from "~/lib/api/client";
import type { Character, CharacterInput } from "./characters.types";

export async function listCharacters(): Promise<Character[]> {
  const { data } = await apiClient.get<Character[]>("/characters");
  return data;
}

export async function getCharacter(id: string): Promise<Character> {
  const { data } = await apiClient.get<Character>(`/characters/${id}`);
  return data;
}

export async function createCharacter(input: CharacterInput): Promise<Character> {
  const { data } = await apiClient.post<Character>("/characters", input);
  return data;
}

export async function updateCharacter(
  id: string,
  input: Partial<CharacterInput>,
): Promise<Character> {
  const { data } = await apiClient.patch<Character>(`/characters/${id}`, input);
  return data;
}

/**
 * PATCH del personaje en el contexto de una crónica.
 * Permite que el narrador edite hojas ajenas asociadas a esa crónica.
 * Si el caller es el dueño, también funciona.
 */
export async function updateCharacterInChronicle(
  chronicleId: string,
  characterId: string,
  input: Partial<CharacterInput>,
): Promise<Character> {
  const { data } = await apiClient.patch<Character>(
    `/chronicles/${chronicleId}/characters/${characterId}`,
    input,
  );
  return data;
}

export async function deleteCharacter(id: string): Promise<{ ok: boolean }> {
  const { data } = await apiClient.delete<{ ok: boolean }>(`/characters/${id}`);
  return data;
}

export async function cloneCharacter(id: string): Promise<Character> {
  const { data } = await apiClient.post<Character>(`/characters/${id}/clone`);
  return data;
}

export interface ChronicleMemberRef {
  id: string;
  email: string;
  nickname: string | null;
  avatar: string | null;
}

export interface ChronicleCharacterEntry {
  joinedAt: string;
  character: Character & { user: ChronicleMemberRef };
}

export interface AssociableCharacter extends Character {
  user: ChronicleMemberRef;
}

export async function listChronicleCharacters(
  chronicleId: string,
): Promise<ChronicleCharacterEntry[]> {
  const { data } = await apiClient.get<ChronicleCharacterEntry[]>(
    `/chronicles/${chronicleId}/characters`,
  );
  return data;
}

export async function listAssociableCharacters(
  chronicleId: string,
): Promise<AssociableCharacter[]> {
  const { data } = await apiClient.get<AssociableCharacter[]>(
    `/chronicles/${chronicleId}/associable-characters`,
  );
  return data;
}

export async function createChronicleCharacter(
  chronicleId: string,
  input: CharacterInput & { targetUserId?: string },
): Promise<Character> {
  const { data } = await apiClient.post<Character>(
    `/chronicles/${chronicleId}/characters`,
    input,
  );
  return data;
}

export async function linkCharacterToChronicle(
  chronicleId: string,
  characterId: string,
): Promise<{ ok: boolean }> {
  const { data } = await apiClient.post<{ ok: boolean }>(
    `/chronicles/${chronicleId}/characters/${characterId}`,
  );
  return data;
}

export async function unlinkCharacterFromChronicle(
  chronicleId: string,
  characterId: string,
): Promise<{ ok: boolean }> {
  const { data } = await apiClient.delete<{ ok: boolean }>(
    `/chronicles/${chronicleId}/characters/${characterId}`,
  );
  return data;
}

/**
 * Transfiere la propiedad de un PC asociado a la crónica a otro miembro.
 * Solo el narrador puede ejecutar la operación; el target debe ser miembro
 * de la crónica.
 */
export async function transferCharacterOwnership(
  chronicleId: string,
  characterId: string,
  targetUserId: string,
): Promise<{ ok: boolean }> {
  const { data } = await apiClient.post<{ ok: boolean }>(
    `/chronicles/${chronicleId}/characters/${characterId}/transfer`,
    { targetUserId },
  );
  return data;
}
