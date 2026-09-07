"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, refreshAccessToken } from "@/lib/api-client";
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
        const accessToken = await refreshAccessToken();
        if (!accessToken) {
          throw new Error("Session expired");
        }

        const user = await apiRequest<AuthUser>("/auth/me");
        if (cancelled) return;

        useAuthStore.getState().setSession({ accessToken, user });
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
