import type { User } from "~/lib/api/users/users.types";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  nickname: string;
  password: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export interface AuthEnvelope {
  user: User;
}

export interface SimpleMessage {
  message: string;
}

export interface RegisterResponse {
  ok: boolean;
  message: string;
}
