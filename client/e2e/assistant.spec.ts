import { test, expect } from "@playwright/test";

/**
 * Phase 11 AI Assistant flow, end-to-end against the real backend (see e2e/README.md for the
 * stack this needs). Unlike project-workflow.spec.ts, this deliberately doesn't assert a specific
 * answer: `NVIDIA_API_KEY` is a user-provided testing secret that may or may not be set in
 * `server/.env` locally, so the assistant may legitimately answer *or* respond with the
 * graceful-degradation message (AssistantProviderUnavailableError, HTTP 503) -- both are correct
 * behavior, never a silently fabricated answer. This test asserts the UI reaches one of those two
 * terminal states rather than requiring a real key to be configured.
 */
test("asks the assistant a question and reaches an answer or a graceful unavailable message", async ({ page }) => {
  const suffix = Date.now();
  const email = `e2e-assistant-${suffix}@example.com`;
  const password = "correct-horse-battery-staple";
  const projectName = `E2E Assistant ${suffix}`;

  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/app");

  await page.getByRole("button", { name: "Create your first project" }).click();
  await page.getByLabel("Name").fill(projectName);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/app\/projects\/[0-9a-f-]{36}$/);

  await page.getByRole("tab", { name: "Assistant" }).click();
  await expect(page).toHaveURL(/\/assistant$/);

  await page.getByLabel("Ask about this project's graph").fill("What hosts are in scope?");
  await page.getByRole("button", { name: "Ask" }).click();

  // Wait for the pending "Asking…" state to resolve, then accept either terminal state.
  await expect(page.getByRole("button", { name: "Ask" })).toBeVisible({ timeout: 30_000 });
  const unavailableAlert = page.getByRole("alert");
  if (await unavailableAlert.isVisible()) {
    await expect(unavailableAlert).toHaveText(/not configured/);
  } else {
    await expect(page.locator("p").filter({ hasText: /.+/ }).last()).toBeVisible();
  }
});
