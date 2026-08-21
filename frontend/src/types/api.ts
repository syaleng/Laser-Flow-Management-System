export type UserRole = "OWNER" | "MANAGER" | "OPERATOR" | "VIEWER";

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiEnvelope<T> { data: T }

export interface LoginResponse {
  access: string;
  user: User;
}

export interface RefreshResponse {
  access: string;
}

export interface ApiErrorPayload {
  error?: { code?: string; message?: string; details?: unknown };
}
