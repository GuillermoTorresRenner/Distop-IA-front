import { apiClient } from "~/lib/api/client";
import type { UserSummary } from "~/lib/api/users/users.types";
import type {
  Chronicle,
  ChronicleInvitation,
  ChronicleListItem,
  CreateChronicleInput,
  InvitationPreview,
  MyInvitation,
  UpdateChronicleInput,
} from "./chronicles.types";

export async function listMyChronicles(): Promise<ChronicleListItem[]> {
  const { data } = await apiClient.get<ChronicleListItem[]>("/chronicles");
  return data;
}

export async function getChronicle(id: string): Promise<Chronicle> {
  const { data } = await apiClient.get<Chronicle>(`/chronicles/${id}`);
  return data;
}

export async function createChronicle(input: CreateChronicleInput): Promise<Chronicle> {
  const { data } = await apiClient.post<Chronicle>("/chronicles", input);
  return data;
}

export async function updateChronicle(id: string, input: UpdateChronicleInput): Promise<Chronicle> {
  const { data } = await apiClient.patch<Chronicle>(`/chronicles/${id}`, input);
  return data;
}

export async function deleteChronicle(id: string): Promise<{ ok: boolean }> {
  const { data } = await apiClient.delete<{ ok: boolean }>(`/chronicles/${id}`);
  return data;
}

export async function inviteToChronicle(
  chronicleId: string,
  payload: { email?: string; userId?: string },
): Promise<ChronicleInvitation> {
  const { data } = await apiClient.post<ChronicleInvitation>(
    `/chronicles/${chronicleId}/invitations`,
    payload,
  );
  return data;
}

export async function searchInvitableUsers(
  chronicleId: string,
  q: string,
): Promise<UserSummary[]> {
  const { data } = await apiClient.get<UserSummary[]>(
    `/chronicles/${chronicleId}/invitable-users`,
    { params: { q } },
  );
  return data;
}

export async function cancelInvitation(
  chronicleId: string,
  invitationId: string,
): Promise<{ ok: boolean }> {
  const { data } = await apiClient.delete<{ ok: boolean }>(
    `/chronicles/${chronicleId}/invitations/${invitationId}`,
  );
  return data;
}

export async function removeMember(
  chronicleId: string,
  userId: string,
): Promise<{ ok: boolean }> {
  const { data } = await apiClient.delete<{ ok: boolean }>(
    `/chronicles/${chronicleId}/members/${userId}`,
  );
  return data;
}

export async function previewInvitation(token: string): Promise<InvitationPreview> {
  const { data } = await apiClient.get<InvitationPreview>(`/invitations/token/${token}`);
  return data;
}

export async function listMyInvitations(): Promise<MyInvitation[]> {
  const { data } = await apiClient.get<MyInvitation[]>("/invitations");
  return data;
}

export async function acceptInvitation(token: string): Promise<{ ok: boolean; chronicleId: string }> {
  const { data } = await apiClient.post<{ ok: boolean; chronicleId: string }>(
    `/invitations/${token}/accept`,
  );
  return data;
}

export async function uploadChronicleImage(
  chronicleId: string,
  file: File,
): Promise<Chronicle> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<Chronicle>(
    `/chronicles/${chronicleId}/image`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

export async function deleteChronicleImage(chronicleId: string): Promise<Chronicle> {
  const { data } = await apiClient.delete<Chronicle>(`/chronicles/${chronicleId}/image`);
  return data;
}
