"use client";

import { useMutation } from "@tanstack/react-query";
import { ApiError, type ApiEnvelope } from "@/lib/api-envelope";
import { useAuthStore, type AuthUser } from "./auth.store";

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput {
  email: string;
  password: string;
  displayName?: string;
}

interface AuthSuccessBody {
  user: AuthUser;
  accessToken: string;
}

/** Posts to one of our own BFF auth routes (never the backend directly) and unwraps the shared envelope. */
async function postAuthRoute<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const envelope = (await response.json()) as ApiEnvelope<T>;
  if (!envelope.success) {
    throw new ApiError(response.status, envelope);
  }
  return envelope.data;
}

export function useLogin() {
  return useMutation({
    mutationFn: (input: LoginInput) => postAuthRoute<AuthSuccessBody>("/api/auth/login", input),
    onSuccess: (data) => {
      useAuthStore.getState().setSession({ accessToken: data.accessToken, user: data.user });
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) => postAuthRoute<AuthSuccessBody>("/api/auth/register", input),
    onSuccess: (data) => {
      useAuthStore.getState().setSession({ accessToken: data.accessToken, user: data.user });
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const accessToken = useAuthStore.getState().accessToken;
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
    },
    onSuccess: () => {
      useAuthStore.getState().clear();
    },
  });
}
