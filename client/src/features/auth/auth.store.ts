import { create } from "zustand";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (session: { accessToken: string; user: AuthUser }) => void;
  setAccessToken: (accessToken: string) => void;
  clear: () => void;
}

/**
 * In-memory-only auth state (FE-008 slice pattern). Deliberately has no persistence
 * middleware — the access token must never touch localStorage/sessionStorage, and the refresh
 * token never reaches this store (or any client JS) at all; it lives solely in the httpOnly
 * cookie set by the `app/api/auth/*` route handlers (SEC-035). A hard reload clears this store;
 * the `/app` layout's bootstrap effect repopulates it via a silent refresh call.
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setSession: ({ accessToken, user }) => set({ accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clear: () => set({ accessToken: null, user: null }),
}));

// Granular selectors — components subscribe to exactly the slice they read (FE-008).
export const useAccessToken = (): string | null => useAuthStore((state) => state.accessToken);
export const useAuthUser = (): AuthUser | null => useAuthStore((state) => state.user);
export const useIsAuthenticated = (): boolean => useAuthStore((state) => state.accessToken !== null);
