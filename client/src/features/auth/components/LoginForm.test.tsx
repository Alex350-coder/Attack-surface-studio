import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/auth.store";
import { LoginForm } from "./LoginForm";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function renderLoginForm() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LoginForm />
    </QueryClientProvider>,
  );
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("LoginForm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    push.mockClear();
    useAuthStore.getState().clear();
  });

  it("shows a validation error and never calls the API when the email is invalid", async () => {
    renderLoginForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "irrelevant");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a valid email address.");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("submits valid credentials, populates the session, and redirects to /app", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, { success: true, data: { user: { id: "u1", email: "a@b.com", displayName: null }, accessToken: "tok" } }),
    );
    renderLoginForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/app"));
    expect(useAuthStore.getState().accessToken).toBe("tok");
  });

  it("shows the server's error message when login fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(401, { success: false, error: { message: "Invalid email or password.", code: "UNAUTHORIZED", correlationId: "c" } }),
    );
    renderLoginForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
    expect(push).not.toHaveBeenCalled();
  });
});
