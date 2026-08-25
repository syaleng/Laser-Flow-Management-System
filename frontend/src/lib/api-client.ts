import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import type { ApiEnvelope, ApiErrorPayload, RefreshResponse } from "@/types/api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;
let unauthorizedHandler: (() => void) | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: ApiErrorPayload,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15_000,
  headers: { Accept: "application/json" },
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15_000,
  headers: { Accept: "application/json" },
});

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function registerUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

function firstValidationMessage(details: unknown): string | undefined {
  if (typeof details === "string") return details;
  if (Array.isArray(details)) {
    return details.find((item): item is string => typeof item === "string");
  }
  if (details && typeof details === "object") {
    for (const value of Object.values(details)) {
      const message = firstValidationMessage(value);
      if (message) return message;
    }
  }
  return undefined;
}

function normalizeApiError(error: AxiosError<ApiErrorPayload>): ApiError {
  const payload = error.response?.data;
  const statusMessage =
    error.response?.status === 401
      ? "Your session has expired. Please sign in again."
      : error.response?.status === 403
        ? "You do not have permission to view this information."
        : undefined;
  const message =
    statusMessage ??
    firstValidationMessage(payload?.error?.details) ??
    payload?.error?.message ??
    (error.code === "ECONNABORTED"
      ? "The server took too long to respond. Please try again."
      : "Unable to connect to the server. Please try again.");
  return new ApiError(message, error.response?.status ?? 0, payload);
}

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<ApiEnvelope<RefreshResponse>>("/auth/token/refresh/")
      .then(({ data }) => {
        setAccessToken(data.data.access);
        return data.data.access;
      })
      .catch((error: AxiosError<ApiErrorPayload>) => {
        setAccessToken(null);
        unauthorizedHandler?.();
        throw normalizeApiError(error);
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorPayload>) => {
    const request = error.config as RetryableRequestConfig | undefined;
    const isAuthenticationAction =
      request?.url?.includes("/auth/login/") ||
      request?.url?.includes("/auth/token/refresh/");

    if (error.response?.status === 401 && request && !request._retry && !isAuthenticationAction) {
      request._retry = true;
      const token = await refreshAccessToken();
      request.headers.Authorization = `Bearer ${token}`;
      return apiClient(request);
    }

    throw normalizeApiError(error);
  },
);
