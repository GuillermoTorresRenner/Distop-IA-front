import { apiClient } from "~/lib/api/client";
import type {
  AddParticipantInput,
  CloneAntagonistInput,
  CombatState,
  RollMookInitiativeResponse,
  UpdateMookHealthInput,
  UpdateParticipantInput,
} from "./combat.types";

export async function getCombat(chronicleId: string): Promise<CombatState> {
  const { data } = await apiClient.get<CombatState>(
    `/chronicles/${chronicleId}/combat`,
  );
  return data;
}

export async function addCombatParticipant(
  chronicleId: string,
  input: AddParticipantInput,
): Promise<CombatState> {
  const { data } = await apiClient.post<CombatState>(
    `/chronicles/${chronicleId}/combat/participants`,
    input,
  );
  return data;
}

export async function updateCombatParticipant(
  chronicleId: string,
  participantId: string,
  patch: UpdateParticipantInput,
): Promise<CombatState> {
  const { data } = await apiClient.patch<CombatState>(
    `/chronicles/${chronicleId}/combat/participants/${participantId}`,
    patch,
  );
  return data;
}

export async function removeCombatParticipant(
  chronicleId: string,
  participantId: string,
): Promise<CombatState> {
  const { data } = await apiClient.delete<CombatState>(
    `/chronicles/${chronicleId}/combat/participants/${participantId}`,
  );
  return data;
}

export async function reorderCombat(
  chronicleId: string,
  orderedIds: string[],
): Promise<CombatState> {
  const { data } = await apiClient.post<CombatState>(
    `/chronicles/${chronicleId}/combat/reorder`,
    { orderedIds },
  );
  return data;
}

export async function advanceCombat(chronicleId: string): Promise<CombatState> {
  const { data } = await apiClient.post<CombatState>(
    `/chronicles/${chronicleId}/combat/advance`,
    {},
  );
  return data;
}

export async function resetCombat(chronicleId: string): Promise<CombatState> {
  const { data } = await apiClient.post<CombatState>(
    `/chronicles/${chronicleId}/combat/reset`,
    {},
  );
  return data;
}

export async function clearCombat(chronicleId: string): Promise<CombatState> {
  const { data } = await apiClient.delete<CombatState>(
    `/chronicles/${chronicleId}/combat`,
  );
  return data;
}

export async function cloneAntagonist(
  chronicleId: string,
  input: CloneAntagonistInput,
): Promise<CombatState> {
  const { data } = await apiClient.post<CombatState>(
    `/chronicles/${chronicleId}/combat/clone-antagonist`,
    input,
  );
  return data;
}

export async function updateMookHealth(
  chronicleId: string,
  participantId: string,
  patch: UpdateMookHealthInput,
): Promise<CombatState> {
  const { data } = await apiClient.patch<CombatState>(
    `/chronicles/${chronicleId}/combat/participants/${participantId}/health`,
    patch,
  );
  return data;
}

export async function rollMookInitiative(
  chronicleId: string,
  participantId: string,
): Promise<RollMookInitiativeResponse> {
  const { data } = await apiClient.post<RollMookInitiativeResponse>(
    `/chronicles/${chronicleId}/combat/participants/${participantId}/roll-initiative`,
    {},
  );
  return data;
}
