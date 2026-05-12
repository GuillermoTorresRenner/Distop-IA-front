import { apiClient } from "~/lib/api/client";
import type { User } from "~/lib/api/users/users.types";
import type {
  AuthEnvelope,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  RegisterResponse,
  ResetPasswordInput,
  SimpleMessage,
} from "./auth.types";

export async function login(input: LoginInput): Promise<User> {
  const { data } = await apiClient.post<AuthEnvelope>("/auth/login", input);
  return data.user;
}

export async function register(input: RegisterInput): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>("/auth/register", input);
  return data;
}

export async function refresh(): Promise<User> {
  const { data } = await apiClient.post<AuthEnvelope>("/auth/refresh");
  return data.user;
}

export async function me(): Promise<User> {
  const { data } = await apiClient.get<User>("/auth/me");
  return data;
}

export async function logout(): Promise<SimpleMessage> {
  const { data } = await apiClient.post<SimpleMessage>("/auth/logout");
  return data;
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<SimpleMessage> {
  const { data } = await apiClient.post<SimpleMessage>("/auth/forgot-password", input);
  return data;
}

export async function resetPassword(input: ResetPasswordInput): Promise<SimpleMessage> {
  const { data } = await apiClient.post<SimpleMessage>("/auth/reset-password", input);
  return data;
}
