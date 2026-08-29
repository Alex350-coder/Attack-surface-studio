import { test, expect } from "@playwright/test";

/**
 * Critical Phase 9 flow, end-to-end against the real backend (see e2e/README.md for the stack
 * this needs). Register -> login -> empty project list -> create -> open -> graph container
 * renders -> logout -> unauthed /app redirects to /login.
 *
 * A freshly created project has no discoveries yet (Phase 9 does not run tools), so "the graph
 * container renders" is asserted via WorkspaceGraphView's empty-graph state -- distinct from its
 * error state -- rather than a populated Graph Engine canvas.
 */
test("register, create a project, view its graph, and sign out", async ({ page }) => {
  const suffix = Date.now();
  const email = `e2e-${suffix}@example.com`;
  const password = "correct-horse-battery-staple";
  const projectName = `E2E Project ${suffix}`;

  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL("/app");
  await expect(page.getByText("No projects yet")).toBeVisible();

  await page.getByRole("button", { name: "Create your first project" }).click();
  await page.getByLabel("Name").fill(projectName);
  await page.getByRole("button", { name: "Create project" }).click();

  await expect(page).toHaveURL(/\/app\/projects\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
  await expect(page.getByText("No discoveries yet. Run a tool against this project to start populating its graph.")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/app");
  await expect(page).toHaveURL(/\/login/);
});
