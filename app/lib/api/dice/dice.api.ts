import { apiClient } from "~/lib/api/client";
import type { DiceRoll } from "~/lib/socket/types";

export async function listChronicleRolls(
  chronicleId: string,
  limit = 50
): Promise<DiceRoll[]> {
  const { data } = await apiClient.get<DiceRoll[]>(
    `/chronicles/${chronicleId}/rolls`,
    { params: { limit } }
  );
  return data;
}

/**
 * Vacía el historial de tiradas de la crónica. Solo permitido al narrador.
 * El back además emite por WS `rolls:cleared` a toda la sala.
 */
export async function clearChronicleRolls(
  chronicleId: string
): Promise<{ ok: boolean; deleted: number }> {
  const { data } = await apiClient.delete<{ ok: boolean; deleted: number }>(
    `/chronicles/${chronicleId}/rolls`
  );
  return data;
}

/**
 * Borra una tirada individual. Solo permitido al narrador.
 * El back emite `roll:deleted` por WS a toda la sala.
 */
export async function deleteChronicleRoll(
  chronicleId: string,
  rollId: string
): Promise<{ ok: boolean; rollId: string }> {
  const { data } = await apiClient.delete<{ ok: boolean; rollId: string }>(
    `/chronicles/${chronicleId}/rolls/${rollId}`
  );
  return data;
}
