import { apiClient } from '~/lib/api/client';
import type { MusicState } from '~/lib/socket/types';

export const getMusicState = (chronicleId: string): Promise<MusicState> =>
  apiClient.get<MusicState>(`/chronicles/${chronicleId}/music/state`).then(r => r.data);

export const playMusic = (chronicleId: string, url: string): Promise<MusicState> =>
  apiClient.post<MusicState>(`/chronicles/${chronicleId}/music/play`, { url }).then(r => r.data);

export const pauseMusic = (chronicleId: string): Promise<MusicState> =>
  apiClient.post<MusicState>(`/chronicles/${chronicleId}/music/pause`).then(r => r.data);

export const resumeMusic = (chronicleId: string): Promise<MusicState> =>
  apiClient.post<MusicState>(`/chronicles/${chronicleId}/music/resume`).then(r => r.data);

export const skipMusic = (chronicleId: string): Promise<MusicState> =>
  apiClient.post<MusicState>(`/chronicles/${chronicleId}/music/skip`).then(r => r.data);

export const stopMusic = (chronicleId: string): Promise<MusicState> =>
  apiClient.post<MusicState>(`/chronicles/${chronicleId}/music/stop`).then(r => r.data);

/** Agrega a la playlist. Si el player está idle, arranca inmediatamente. */
export const queueMusic = (chronicleId: string, url: string): Promise<MusicState> =>
  apiClient.post<MusicState>(`/chronicles/${chronicleId}/music/queue`, { url }).then(r => r.data);

/** Salta directamente a un track por su índice en la playlist. */
export const playAt = (chronicleId: string, index: number): Promise<MusicState> =>
  apiClient.post<MusicState>(`/chronicles/${chronicleId}/music/play-at/${index}`).then(r => r.data);

/** Elimina un track de la playlist por índice. */
export const removeFromPlaylist = (chronicleId: string, index: number): Promise<MusicState> =>
  apiClient.delete<MusicState>(`/chronicles/${chronicleId}/music/queue/${index}`).then(r => r.data);

/** Limpia toda la playlist y detiene la reproducción. */
export const clearPlaylist = (chronicleId: string): Promise<MusicState> =>
  apiClient.delete<MusicState>(`/chronicles/${chronicleId}/music/queue`).then(r => r.data);

/** URL del stream chunked para el tag <audio>. */
export const getMusicStreamUrl = (chronicleId: string): string => {
  const base = typeof window !== 'undefined'
    ? (import.meta.env.VITE_API_URL?.replace('/api', '') ?? '')
    : '';
  return `${base}/api/chronicles/${chronicleId}/music/stream`;
};
