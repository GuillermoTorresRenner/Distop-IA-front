import { apiClient } from '~/lib/api/client';
import type { AudioFolder, AudioTrack } from './audio-library.types';

// ── Folders ────────────────────────────────────────────────

export const listFolders = (): Promise<AudioFolder[]> =>
  apiClient.get<AudioFolder[]>('/audio-library/folders').then(r => r.data);

export const createFolder = (name: string): Promise<AudioFolder> =>
  apiClient.post<AudioFolder>('/audio-library/folders', { name }).then(r => r.data);

export const renameFolder = (id: string, name: string): Promise<AudioFolder> =>
  apiClient.patch<AudioFolder>(`/audio-library/folders/${id}`, { name }).then(r => r.data);

export const deleteFolder = (id: string): Promise<void> =>
  apiClient.delete(`/audio-library/folders/${id}`).then(() => undefined);

export const reorderFolders = (ids: string[]): Promise<AudioFolder[]> =>
  apiClient.post<AudioFolder[]>('/audio-library/folders/reorder', { ids }).then(r => r.data);

// ── Tracks ─────────────────────────────────────────────────

export const listMyTracks = (q?: string): Promise<AudioTrack[]> =>
  apiClient.get<AudioTrack[]>('/audio-library/tracks', { params: q ? { q } : {} }).then(r => r.data);

export const listCommunityTracks = (q?: string): Promise<AudioTrack[]> =>
  apiClient.get<AudioTrack[]>('/audio-library/tracks/community', { params: q ? { q } : {} }).then(r => r.data);

export interface UploadTrackMeta {
  title?: string;
  folderId?: string;
}

export const uploadLibraryTrack = (file: File, meta?: UploadTrackMeta): Promise<AudioTrack> => {
  const form = new FormData();
  form.append('file', file);
  if (meta?.title)    form.append('title', meta.title);
  if (meta?.folderId) form.append('folderId', meta.folderId);
  return apiClient.post<AudioTrack>('/audio-library/tracks/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};

export const updateTrack = (id: string, patch: Partial<Pick<AudioTrack, 'title' | 'folderId'>>): Promise<AudioTrack> =>
  apiClient.patch<AudioTrack>(`/audio-library/tracks/${id}`, patch).then(r => r.data);

export const moveTrack = (id: string, folderId: string | null): Promise<AudioTrack> =>
  apiClient.patch<AudioTrack>(`/audio-library/tracks/${id}/move`, { folderId }).then(r => r.data);

export const reorderTracks = (ids: string[]): Promise<AudioTrack[]> =>
  apiClient.post<AudioTrack[]>('/audio-library/tracks/reorder', { ids }).then(r => r.data);

export const deleteLibraryTrack = (id: string): Promise<void> =>
  apiClient.delete(`/audio-library/tracks/${id}`).then(() => undefined);

// ── Agregar a playlist de crónica ──────────────────────────
export const addLibraryTrackToPlaylist = (chronicleId: string, trackId: string) =>
  apiClient.post(`/chronicles/${chronicleId}/music/queue-library`, { trackId }).then(r => r.data);

/** URL pública del archivo (para preview sin auth). */
export const getLibraryTrackUrl = (userId: string, filename: string): string => {
  const base = typeof window !== 'undefined'
    ? (import.meta.env.VITE_API_URL?.replace('/api', '') ?? '')
    : '';
  return `${base}/audio/users/${userId}/${filename}`;
};
