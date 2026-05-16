import { apiClient } from "~/lib/api/client";
import type { Conversation, DirectMessage } from "./messages.types";

export async function listConversations(): Promise<Conversation[]> {
  const { data } = await apiClient.get<Conversation[]>(
    "/messages/conversations",
  );
  return data;
}

export async function listMessagesWith(
  peerId: string,
  params?: { take?: number; before?: string },
): Promise<DirectMessage[]> {
  const { data } = await apiClient.get<DirectMessage[]>(`/messages/${peerId}`, {
    params,
  });
  return data;
}

export async function sendDirectMessage(payload: {
  recipientId: string;
  body: string;
}): Promise<DirectMessage> {
  const { data } = await apiClient.post<DirectMessage>("/messages", payload);
  return data;
}

export async function deleteDirectMessage(
  messageId: string,
): Promise<DirectMessage> {
  const { data } = await apiClient.delete<DirectMessage>(
    `/messages/${messageId}`,
  );
  return data;
}

export async function markConversationRead(
  peerId: string,
): Promise<{ readIds: string[]; at: string }> {
  const { data } = await apiClient.patch<{ readIds: string[]; at: string }>(
    `/messages/${peerId}/read`,
  );
  return data;
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const { data } = await apiClient.get<{ count: number }>(
    "/messages/unread-count",
  );
  return data;
}
