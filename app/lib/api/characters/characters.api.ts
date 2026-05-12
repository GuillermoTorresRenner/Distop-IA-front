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

export async function deleteCharacter(id: string): Promise<{ ok: boolean }> {
  const { data } = await apiClient.delete<{ ok: boolean }>(`/characters/${id}`);
  return data;
}

export async function associateChronicle(
  characterId: string,
  chronicleId: string,
): Promise<Character> {
  const { data } = await apiClient.post<Character>(
    `/characters/${characterId}/chronicles`,
    { chronicleId },
  );
  return data;
}

export async function dissociateChronicle(
  characterId: string,
  chronicleId: string,
): Promise<Character> {
  const { data } = await apiClient.delete<Character>(
    `/characters/${characterId}/chronicles/${chronicleId}`,
  );
  return data;
}
