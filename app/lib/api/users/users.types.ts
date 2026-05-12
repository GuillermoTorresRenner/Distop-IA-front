export interface User {
  id: string;
  email: string;
  nickname: string;
  isActive: boolean;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSummary {
  id: string;
  email: string;
  nickname: string;
  avatar: string | null;
}
