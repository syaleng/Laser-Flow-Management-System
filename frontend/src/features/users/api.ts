import { apiClient } from "@/lib/api-client";
import type { User, UserRole } from "@/types/api";

export interface UserList { data: User[]; meta: { count: number; page: number; total_pages: number } }
export interface UserInput { email: string; full_name: string; phone: string; role: UserRole; password?: string }

export async function getUsers(): Promise<UserList> { const { data } = await apiClient.get<UserList>("/users/", { params: { page_size: 100 } }); return data; }
export async function createUser(input: UserInput): Promise<User> { const { data } = await apiClient.post<User>("/users/", input); return data; }
export async function updateUser(id: string, input: Partial<UserInput & { is_active: boolean }>): Promise<User> { const { data } = await apiClient.patch<User>(`/users/${id}/`, input); return data; }
export async function setUserActive(id: string, active: boolean): Promise<User> { const { data } = await apiClient.post<{ data: User }>(`/users/${id}/${active ? "activate" : "deactivate"}/`); return data.data; }
export async function resetUserPassword(id: string, newPassword: string): Promise<void> { await apiClient.post(`/users/${id}/reset-password/`, { new_password: newPassword }); }
