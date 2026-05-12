import { apiClient } from "~/lib/api/client";
import type { Friendship, SearchUsersResponse } from "./social.types";

export async function searchUsers(params: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<SearchUsersResponse> {
  const { data } = await apiClient.get<SearchUsersResponse>("/social/users", {
    params,
  });
  return data;
}

export async function listFriends(): Promise<Friendship[]> {
  const { data } = await apiClient.get<Friendship[]>("/social/friends");
  return data;
}

export async function listIncomingRequests(): Promise<Friendship[]> {
  const { data } = await apiClient.get<Friendship[]>(
    "/social/friend-requests/incoming",
  );
  return data;
}

export async function listOutgoingRequests(): Promise<Friendship[]> {
  const { data } = await apiClient.get<Friendship[]>(
    "/social/friend-requests/outgoing",
  );
  return data;
}

export async function requestFriendship(addresseeId: string): Promise<Friendship> {
  const { data } = await apiClient.post<Friendship>("/social/friend-requests", {
    addresseeId,
  });
  return data;
}

export async function acceptFriendship(id: string): Promise<Friendship> {
  const { data } = await apiClient.patch<Friendship>(
    `/social/friend-requests/${id}/accept`,
  );
  return data;
}

export async function declineFriendship(id: string): Promise<{ ok: boolean }> {
  const { data } = await apiClient.patch<{ ok: boolean }>(
    `/social/friend-requests/${id}/decline`,
  );
  return data;
}

export async function removeFriendship(id: string): Promise<{ ok: boolean }> {
  const { data } = await apiClient.delete<{ ok: boolean }>(
    `/social/friendships/${id}`,
  );
  return data;
}
