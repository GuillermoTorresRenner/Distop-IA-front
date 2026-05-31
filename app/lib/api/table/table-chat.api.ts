import { apiClient } from "~/lib/api/client";
import type { ChatMessage } from "~/lib/socket/types";

/** Mensaje persistido que devuelve el endpoint REST (forma plana). */
export interface PersistedChatMessage {
  id: string;
  userId: string;
  characterId: string | null;
  speakerKind: string;
  speakerName: string;
  speakerAvatar: string | null;
  text: string;
  recipientKind: string;
  recipientUserId: string | null;
  createdAt: string;
}

/** Convierte el formato plano del REST al formato `ChatMessage` del WS. */
export function toFeedMessage(m: PersistedChatMessage): ChatMessage {
  return {
    id: m.id,
    userId: m.userId,
    email: "",
    speaker: {
      kind: m.speakerKind as "self" | "character" | "system",
      name: m.speakerName,
      characterId: m.characterId,
      avatar: m.speakerAvatar,
    },
    text: m.text,
    at: m.createdAt,
    recipient: {
      kind: m.recipientKind as "all" | "narrator" | "user",
      userId: m.recipientUserId,
    },
  };
}

export async function listChronicleMessages(
  chronicleId: string,
  limit = 100
): Promise<PersistedChatMessage[]> {
  const { data } = await apiClient.get<PersistedChatMessage[]>(
    `/chronicles/${chronicleId}/messages`,
    { params: { limit } }
  );
  return data;
}

export async function deleteChatMessage(
  chronicleId: string,
  messageId: string
): Promise<{ ok: boolean; messageId: string }> {
  const { data } = await apiClient.delete<{ ok: boolean; messageId: string }>(
    `/chronicles/${chronicleId}/messages/${messageId}`
  );
  return data;
}
