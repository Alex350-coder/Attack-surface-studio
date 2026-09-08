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
    // Read the store directly instead of depending on the reactive `isAuthenticated` value below.
    // `refreshAccessToken()` inside `bootstrap()` calls `setAccessToken` as soon as it resolves,
    // which flips `isAuthenticated` true *before* `/auth/me` has returned. If this effect
    // depended on `isAuthenticated`, that flip would re-run it -- tearing down this in-flight
    // call (`cancelled = true`) right as it awaits `/auth/me`, so `setSession` never lands and
    // `user` stays `null` forever even though `accessToken` is set (BUG #9: every user-derived
    // UI, e.g. RunDetail's owner/admin-gated "View raw output" button, silently stayed hidden for
    // a real owner after any hard reload).
    if (useAuthStore.getState().accessToken !== null) {
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
    // Bootstrap must run exactly once per mount, regardless of `isAuthenticated` or `router`
    // identity changing along the way -- see the comment above for why depending on either
    // reopens the same race.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isReady: isAuthenticated || bootstrapped };
}
