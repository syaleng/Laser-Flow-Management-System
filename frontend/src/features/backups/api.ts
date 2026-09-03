import { apiClient } from "@/lib/api-client";

export interface SystemBackup {
  filename: string;
  size: number;
  created_at: string;
  created_by: string;
}

export async function getBackups(): Promise<SystemBackup[]> {
  const { data } = await apiClient.get<{ data: SystemBackup[] }>("/backups/");
  return data.data;
}

export async function createBackup(): Promise<SystemBackup> {
  const { data } = await apiClient.post<{ data: SystemBackup }>("/backups/", undefined, { timeout: 120_000 });
  return data.data;
}

export async function downloadBackup(filename: string): Promise<void> {
  const { data } = await apiClient.get<Blob>(`/backups/${encodeURIComponent(filename)}/`, { responseType: "blob", timeout: 120_000 });
  const url = URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function deleteBackup(filename: string): Promise<void> {
  await apiClient.delete(`/backups/${encodeURIComponent(filename)}/`);
}

export async function restoreBackup(input: { file: File; password: string }): Promise<void> {
  const body = new FormData();
  body.append("backup", input.file);
  body.append("password", input.password);
  body.append("confirmation", "RESTORE");
  await apiClient.post("/backups/restore/", body, { timeout: 10 * 60_000 });
}
