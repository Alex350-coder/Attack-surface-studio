import { afterEach, describe, expect, it } from "vitest";
import { useAuthStore } from "./auth.store";

const user = { id: "u1", email: "person@example.com", displayName: "Person" };

afterEach(() => {
  useAuthStore.getState().clear();
});

describe("useAuthStore", () => {
  it("starts with no session", () => {
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("setSession stores both the access token and the user", () => {
    useAuthStore.getState().setSession({ accessToken: "token-1", user });
    expect(useAuthStore.getState().accessToken).toBe("token-1");
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it("setAccessToken rotates the token without touching the user", () => {
    useAuthStore.getState().setSession({ accessToken: "token-1", user });
    useAuthStore.getState().setAccessToken("token-2");
    expect(useAuthStore.getState().accessToken).toBe("token-2");
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it("clear resets both fields", () => {
    useAuthStore.getState().setSession({ accessToken: "token-1", user });
    useAuthStore.getState().clear();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
