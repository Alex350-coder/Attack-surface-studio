import { test, expect } from "@playwright/test";

/**
 * Phase 10 critical flow, end-to-end against the real backend (see e2e/README.md for the stack
 * this needs). Extends workspace.spec.ts's register/create-project setup, then exercises every
 * new Phase 10 surface in one continuous session: run the harmless `stub` adapter (Plan.md's
 * INTEGRATION_SYSTEM.md test tool, never touches the network) -> poll to completion -> the graph
 * enriches with the stub's asset+finding nodes -> upload evidence -> it's listed -> assemble a
 * report from a selected node -> the preview renders it read-only.
 */
test("run a tool, upload evidence, and assemble a report from the resulting graph", async ({ page }) => {
  const suffix = Date.now();
  const email = `e2e-workflow-${suffix}@example.com`;
  const password = "correct-horse-battery-staple";
  const projectName = `E2E Workflow ${suffix}`;
  const target = `stub-target-${suffix}.example`;

  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/app");

  await page.getByRole("button", { name: "Create your first project" }).click();
  await page.getByLabel("Name").fill(projectName);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/app\/projects\/[0-9a-f-]{36}$/);
  const projectUrl = page.url();

  // --- Runs: launch the stub adapter and wait for it to complete ---
  await page.getByRole("tab", { name: "Runs" }).click();
  await expect(page).toHaveURL(/\/tools$/);

  await page.getByLabel("Tool").selectOption({ label: "Stub Adapter (Phase 6 test tool)" });
  await page.getByLabel("Target").fill(target);
  await page.getByRole("button", { name: "Start run" }).click();

  const runLink = page.getByRole("link", { name: new RegExp(`stub — ${target}`) });
  await expect(runLink).toBeVisible();
  await runLink.click();
  await expect(page.getByText("succeeded")).toBeVisible({ timeout: 30_000 });

  // --- Graph: the stub's asset + finding nodes now appear ---
  await page.goto(projectUrl);
  await expect(page.getByText(target)).toBeVisible();
  await expect(page.getByText(`stub scan of ${target} completed`)).toBeVisible();

  // --- Evidence: upload a file and see it listed ---
  await page.getByRole("tab", { name: "Evidence" }).click();
  await expect(page).toHaveURL(/\/evidence$/);

  await page.getByRole("button", { name: "Upload evidence" }).click();
  await page.getByLabel("File").setInputFiles({
    name: "note.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("e2e evidence content"),
  });
  await page.getByLabel("Label (optional)").fill("E2E evidence note");
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(page.getByText("E2E evidence note")).toBeVisible();

  // --- Reports: assemble one from the asset node discovered by the stub run ---
  await page.getByRole("tab", { name: "Reports" }).click();
  await expect(page).toHaveURL(/\/reports$/);

  await page.getByRole("button", { name: "Assemble a report" }).click();
  await page.getByLabel("Report title").fill(`E2E Report ${suffix}`);
  await page.getByText(target, { exact: true }).click();
  await expect(page.getByText("(1 selected)")).toBeVisible();
  await page.getByRole("button", { name: "Assemble report" }).click();

  await expect(page).toHaveURL(/\/reports\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: `E2E Report ${suffix}` })).toBeVisible();
  await expect(page.getByText("draft")).toBeVisible();
});
