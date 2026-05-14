import { apiClient } from "~/lib/api/client";

export interface BoardFileRef {
  url: string;
  mimeType: string;
}

export type BoardFileRefs = Record<string, BoardFileRef>;

export interface ChronicleBoard {
  id: string;
  chronicleId: string;
  elements: unknown[];
  appState: Record<string, unknown> | null;
  fileRefs: BoardFileRefs;
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

/**
 * Sube un binario (imagen) usado por la pizarra al back.
 * El back lo persiste como webp en disco y devuelve la URL relativa más
 * el mimeType del archivo final (siempre image/webp).
 */
export async function uploadBoardFile(
  chronicleId: string,
  fileId: string,
  dataURL: string
): Promise<{ fileId: string; url: string; mimeType: string }> {
  const { data } = await apiClient.post<{
    fileId: string;
    url: string;
    mimeType: string;
  }>(`/chronicles/${chronicleId}/board/files`, { fileId, dataURL });
  return data;
}
