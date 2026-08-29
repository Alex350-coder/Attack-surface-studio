import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/auth.store";
import { RegisterForm } from "./RegisterForm";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function renderRegisterForm() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RegisterForm />
    </QueryClientProvider>,
  );
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("RegisterForm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    push.mockClear();
    useAuthStore.getState().clear();
  });

  it("shows a validation error and never calls the API when the password is too short", async () => {
    renderRegisterForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Password must be at least 12 characters.");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("submits valid details, populates the session, and redirects to /app", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, {
        success: true,
        data: { user: { id: "u1", email: "a@b.com", displayName: null }, accessToken: "tok" },
      }),
    );
    renderRegisterForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "correct-password-123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/app"));
    expect(useAuthStore.getState().accessToken).toBe("tok");
  });

  it("shows the server's error message when registration fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(409, { success: false, error: { message: "Email already in use.", code: "CONFLICT", correlationId: "c" } }),
    );
    renderRegisterForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "correct-password-123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email already in use.");
    expect(push).not.toHaveBeenCalled();
  });
});
