import { test, expect } from "@playwright/test";

/**
 * Phase 12 report export flow, end-to-end against the real backend (see e2e/README.md for the
 * stack this needs). Extends project-workflow.spec.ts's register -> run a tool -> assemble a
 * report setup, then exercises the new export surface: pick a format, trigger a download, and
 * confirm the browser actually receives file bytes.
 */
test("assembles a report and exports it as a downloadable file", async ({ page }) => {
  const suffix = Date.now();
  const email = `e2e-export-${suffix}@example.com`;
  const password = "correct-horse-battery-staple";
  const projectName = `E2E Export ${suffix}`;
  const target = `stub-export-target-${suffix}.example`;

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

  // --- Runs: launch the stub adapter so the graph has a node to assemble a report from ---
  await page.getByRole("tab", { name: "Runs" }).click();
  await expect(page).toHaveURL(/\/tools$/);

  await page.getByLabel("Tool", { exact: true }).selectOption({ label: "Stub Adapter (Phase 6 test tool)" });
  await page.getByLabel("Target").fill(target);
  await page.getByRole("button", { name: "Start run" }).click();

  const runLink = page.getByRole("link", { name: new RegExp(`stub — ${target}`) });
  await expect(runLink).toBeVisible();
  await runLink.click();
  await expect(page.getByText("succeeded")).toBeVisible({ timeout: 30_000 });

  await page.goto(projectUrl);
  await expect(page.getByText(target)).toBeVisible();

  // --- Reports: assemble one from the discovered node, then export it ---
  await page.getByRole("tab", { name: "Reports" }).click();
  await expect(page).toHaveURL(/\/reports$/);

  await page.getByRole("button", { name: "Assemble a report" }).click();
  await page.getByLabel("Report title").fill(`E2E Export Report ${suffix}`);
  await page.getByText(target, { exact: true }).click();
  await expect(page.getByText("(1 selected)")).toBeVisible();
  await page.getByRole("button", { name: "Assemble report" }).click();

  await expect(page).toHaveURL(/\/reports\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: `E2E Export Report ${suffix}` })).toBeVisible();

  await page.getByLabel("Export format").selectOption("markdown");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/\.md$/);
});
