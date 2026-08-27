import { useAuthStore } from "@/features/auth/auth.store";
import { ApiError, type ApiEnvelope, type ApiSuccessEnvelope } from "./api-envelope";

export { ApiError };

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/v1`;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Skips the Authorization header and the 401-refresh retry (used by auth endpoints themselves). */
  skipAuth?: boolean;
}

async function rawRequest<T>(path: string, options: RequestOptions): Promise<{ status: number; envelope: ApiEnvelope<T> }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!options.skipAuth) {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  const envelope = (await response.json()) as ApiEnvelope<T>;
  return { status: response.status, envelope };
}

/**
 * Refreshes the access token once via the BFF route (never the backend directly -- only the
 * route handler can read the httpOnly refresh cookie, SEC-035). Returns the new token, or null
 * if the refresh itself failed (session is gone; caller must sign the user out).
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
    const envelope = (await response.json()) as ApiEnvelope<{ accessToken: string }>;
    if (!envelope.success) return null;
    useAuthStore.getState().setAccessToken(envelope.data.accessToken);
    return envelope.data.accessToken;
  } catch {
    return null;
  }
}

/**
 * Unwraps the `{ success, data }` / `{ success:false, error }` envelope and retries exactly
 * once after a transparent access-token refresh on a 401 (FE-004 -- callers still validate
 * `data`'s shape with Zod before trusting it).
 */
async function requestEnvelope<T>(path: string, options: RequestOptions): Promise<ApiSuccessEnvelope<T>> {
  let { status, envelope } = await rawRequest<T>(path, options);

  if (status === 401 && !options.skipAuth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      ({ status, envelope } = await rawRequest<T>(path, options));
    } else {
      useAuthStore.getState().clear();
    }
  }

  if (!envelope.success) {
    throw new ApiError(status, envelope);
  }
  return envelope;
}

/** Generic authenticated API call, returning just the unwrapped `data` payload. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const envelope = await requestEnvelope<T>(path, options);
  return envelope.data;
}

/** Same as `apiRequest`, but also returns pagination `meta` for list endpoints. */
export async function apiRequestPaginated<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ items: T; meta?: { total: number; page: number; pageSize: number } }> {
  const envelope = await requestEnvelope<T>(path, options);
  return { items: envelope.data, meta: envelope.meta };
}
