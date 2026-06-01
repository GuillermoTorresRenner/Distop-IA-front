import { apiClient } from '~/lib/api/client';
import type { LoopMode, MusicState } from '~/lib/socket/types';

export const getMusicState = (chronicleId: string): Promise<MusicState> =>
  apiClient.get<MusicState>(`/chronicles/${chronicleId}/music/state`).then(r => r.data);

export interface UploadTrackMeta {
  title?: string;
  description?: string;
  category?: string;
  subcategory?: string;
}

export const uploadTrack = (
  chronicleId: string,
  file: File,
  meta?: UploadTrackMeta,
): Promise<MusicState> => {
  const form = new FormData();
  form.append('file', file);
  if (meta?.title)       form.append('title', meta.title);
  if (meta?.description) form.append('description', meta.description);
  if (meta?.category)    form.append('category', meta.category);
  if (meta?.subcategory) form.append('subcategory', meta.subcategory);
  return apiClient
    .post<MusicState>(`/chronicles/${chronicleId}/music/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then(r => r.data);
};

export const pauseMusic = (chronicleId: string): Promise<MusicState> =>
  apiClient.post<MusicState>(`/chronicles/${chronicleId}/music/pause`).then(r => r.data);

export const resumeMusic = (chronicleId: string): Promise<MusicState> =>
  apiClient.post<MusicState>(`/chronicles/${chronicleId}/music/resume`).then(r => r.data);

export const skipMusic = (chronicleId: string): Promise<MusicState> =>
  apiClient.post<MusicState>(`/chronicles/${chronicleId}/music/skip`).then(r => r.data);

export const stopMusic = (chronicleId: string): Promise<MusicState> =>
  apiClient.post<MusicState>(`/chronicles/${chronicleId}/music/stop`).then(r => r.data);

export const playAt = (chronicleId: string, index: number): Promise<MusicState> =>
  apiClient.post<MusicState>(`/chronicles/${chronicleId}/music/play-at/${index}`).then(r => r.data);

export const removeFromPlaylist = (chronicleId: string, index: number): Promise<MusicState> =>
  apiClient.delete<MusicState>(`/chronicles/${chronicleId}/music/queue/${index}`).then(r => r.data);

export const clearPlaylist = (chronicleId: string): Promise<MusicState> =>
  apiClient.delete<MusicState>(`/chronicles/${chronicleId}/music/queue`).then(r => r.data);

/** Cambia el modo de loop (solo narrador). */
export const setLoopMode = (chronicleId: string, mode: LoopMode): Promise<MusicState> =>
  apiClient.post<MusicState>(`/chronicles/${chronicleId}/music/loop`, { mode }).then(r => r.data);

/** El cliente informa que el track terminó; el servidor decide qué sigue según el modo loop. */
export const notifyTrackEnded = (chronicleId: string): Promise<MusicState> =>
  apiClient.post<MusicState>(`/chronicles/${chronicleId}/music/next`).then(r => r.data);

/** Borra el archivo del servidor y lo saca de la playlist (narrador). */
export const deleteTrackFile = (chronicleId: string, filename: string): Promise<MusicState> =>
  apiClient.delete<MusicState>(`/chronicles/${chronicleId}/music/track/${filename}`).then(r => r.data);

/** URL del stream de un track específico (con soporte Range). */
export const getTrackStreamUrl = (chronicleId: string, filename: string): string => {
  const base =
    typeof window !== 'undefined'
      ? (import.meta.env.VITE_API_URL?.replace('/api', '') ?? '')
      : '';
  return `${base}/api/chronicles/${chronicleId}/music/stream/${filename}`;
};
