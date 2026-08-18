import { test, expect } from "@playwright/test";
import { backupAppSettings } from "./helpers";

// app_settings is a single shared row (this app has no per-test-user
// isolation), so every test here backs up the row first and restores it in
// an `afterEach`, regardless of pass/fail.
let restore: () => Promise<void>;

test.beforeEach(async () => {
  restore = await backupAppSettings();
});

test.afterEach(async () => {
  await restore();
});

test("updating free transfers persists and survives a reload", async ({ page }) => {
  await page.goto("/settings");
  const input = page.locator('input[name="freeTransfers"]');
  await input.fill("3");
  await page.locator('form:has(input[name="freeTransfers"]) button[type="submit"]').click();
  await expect(page.getByText("Saved.")).toBeVisible({ timeout: 10_000 });

  await page.reload();
  await expect(page.locator('input[name="freeTransfers"]')).toHaveValue("3");
});

test("rejects a free-transfers value outside the allowed range", async ({ page }) => {
  await page.goto("/settings");
  const input = page.locator('input[name="freeTransfers"]');
  // The input's own min=0/max=5 attributes make the browser block
  // out-of-range submission before it ever reaches the server — so a
  // realistic user can't trigger the server-side message this test is
  // actually after. Strip the constraint to simulate a request that
  // bypasses the client (a direct API call, a modified page, JS disabled)
  // and confirm the server's own validation still catches it.
  await input.evaluate((el: HTMLInputElement) => el.removeAttribute("max"));
  await input.fill("99");
  await page.locator('form:has(input[name="freeTransfers"]) button[type="submit"]').click();
  await expect(page.getByText("Enter a number between 0 and 5")).toBeVisible({ timeout: 10_000 });
});

test("toggling the email notification preference persists", async ({ page }) => {
  await page.goto("/settings");
  const checkbox = page.locator('input[type="checkbox"]');
  const wasChecked = await checkbox.isChecked();
  await checkbox.click();
  await expect(page.getByText("Saved.")).toBeVisible({ timeout: 10_000 });

  await page.reload();
  await expect(page.locator('input[type="checkbox"]')).toBeChecked({ checked: !wasChecked });
});

test("rejects a nonexistent FPL team ID on the settings page too", async ({ page }) => {
  await page.goto("/settings");
  await page.locator('input[name="teamId"]').fill("999999999");
  await page.locator('form:has(input[name="teamId"]) button[type="submit"]').click();
  await expect(page.getByText("Couldn't find that FPL team ID.")).toBeVisible({ timeout: 15_000 });
});
