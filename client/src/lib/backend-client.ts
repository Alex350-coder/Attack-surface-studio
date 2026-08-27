import type { ApiEnvelope } from "./api-envelope";

const BACKEND_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/v1`;

interface BackendRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  authorization?: string;
}

/**
 * Server-only fetch to the NestJS backend. Used exclusively by the auth BFF route handlers
 * (client/src/app/api/auth/*) -- the only code allowed to read or mint the httpOnly refresh
 * cookie (SEC-035). Never import this from a Client Component: it runs on the Next.js server,
 * not the browser, and talks to the backend origin directly (no `credentials: "include"`,
 * no browser cookie jar involved).
 */
export async function backendRequest<T>(
  path: string,
  options: BackendRequestOptions = {},
): Promise<{ status: number; envelope: ApiEnvelope<T> }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.authorization) {
    headers.Authorization = options.authorization;
  }

  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method: options.method ?? "POST",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const envelope = (await response.json()) as ApiEnvelope<T>;
  return { status: response.status, envelope };
}
