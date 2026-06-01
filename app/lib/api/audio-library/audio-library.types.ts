export interface AudioFolder {
  id: string;
  userId: string;
  name: string;
  order: number;
  tracks: AudioTrack[];
  createdAt: string;
  updatedAt: string;
}

export interface AudioTrack {
  id: string;
  userId: string;
  folderId: string | null;
  folder?: { id: string; name: string } | null;
  filename: string;
  originalName: string;
  title: string;
  mimeType: string;
  size: number;
  duration: number | null;
  isPublic: boolean;
  order: number;
  user?: { id: string; nickname: string | null; avatar: string | null };
  createdAt: string;
  updatedAt: string;
}
