import { apiClient, setAccessToken } from "@/lib/api-client";
import type { ApiEnvelope, LoginResponse, User } from "@/types/api";

import type { LoginInput } from "./auth-context";

export async function login(input: LoginInput): Promise<User> {
  setAccessToken(null);
  const { data } = await apiClient.post<ApiEnvelope<LoginResponse>>("/auth/login/", input);
  setAccessToken(data.data.access);
  return data.data.user;
}

export async function loadCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<ApiEnvelope<User>>("/auth/me/");
  return data.data;
}

export async function logout(): Promise<void> {
  setAccessToken(null);
  await apiClient.post("/auth/logout/");
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.post("/auth/change-password/", {
    current_password: currentPassword,
    new_password: newPassword,
  });
}
