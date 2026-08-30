"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-envelope";
import { useAuthStore, useIsAuthenticated, type AuthUser } from "./auth.store";

/**
 * Repopulates the in-memory auth store after a hard reload (the store is deliberately never
 * persisted, auth.store.ts) by silently refreshing the access token from the httpOnly cookie
 * and fetching the current user. Redirects to /login if the refresh cookie is missing or
 * invalid -- the proxy.ts gate already tries to prevent reaching this point without one, but a
 * client-side navigation/reload can still race it.
 */
export function useBootstrapSession(): { isReady: boolean } {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      return;
    }

    let cancelled = false;

    async function bootstrap(): Promise<void> {
      try {
        const response = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
        const envelope = (await response.json()) as ApiEnvelope<{ accessToken: string }>;
        if (!envelope.success) {
          throw new Error("Session expired");
        }

        useAuthStore.getState().setAccessToken(envelope.data.accessToken);
        const user = await apiRequest<AuthUser>("/auth/me");
        if (cancelled) return;

        useAuthStore.getState().setSession({ accessToken: envelope.data.accessToken, user });
        setBootstrapped(true);
      } catch {
        if (cancelled) return;
        useAuthStore.getState().clear();
        router.replace("/login");
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, router]);

  return { isReady: isAuthenticated || bootstrapped };
}
