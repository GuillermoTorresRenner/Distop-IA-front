import { apiClient } from "~/lib/api/client";

export interface ChronicleBoard {
  id: string;
  chronicleId: string;
  elements: unknown[];
  appState: Record<string, unknown> | null;
  isShared: boolean;
  updatedAt: string;
  createdAt: string;
}

export async function getBoard(chronicleId: string): Promise<ChronicleBoard> {
  const { data } = await apiClient.get<ChronicleBoard>(
    `/chronicles/${chronicleId}/board`
  );
  return data;
}

export async function saveBoard(
  chronicleId: string,
  payload: {
    elements: unknown[];
    appState?: Record<string, unknown> | null;
  }
): Promise<ChronicleBoard> {
  const { data } = await apiClient.put<ChronicleBoard>(
    `/chronicles/${chronicleId}/board`,
    {
      elements: payload.elements,
      appState: payload.appState ?? undefined,
    }
  );
  return data;
}
