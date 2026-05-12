import { apiClient } from "~/lib/api/client";
import type { User } from "./users.types";

export interface UpdateUserInput {
  email?: string;
  nickname?: string;
  password?: string;
}

export async function updateUser(userId: string, input: UpdateUserInput): Promise<User> {
  const { data } = await apiClient.put<User>(`/users/${userId}`, input);
  return data;
}

export async function uploadUserAvatar(userId: string, file: File): Promise<User> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<User>(
    `/users/${userId}/avatar`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

export async function deleteUserAvatar(userId: string): Promise<User> {
  const { data } = await apiClient.delete<User>(`/users/${userId}/avatar`);
  return data;
}
