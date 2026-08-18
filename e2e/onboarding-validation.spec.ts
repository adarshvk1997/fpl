import { test, expect } from "@playwright/test";

// These tests exercise validation paths only — every assertion here fails
// before any database write or AI call, so they're safe to run against the
// live app without touching real onboarding state or costing anything.

test.describe("onboarding — team ID path", () => {
  test("rejects a team ID that doesn't exist on the FPL API", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByPlaceholder("e.g. 1234567").fill("999999999");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Couldn't find that FPL team ID")).toBeVisible({ timeout: 15_000 });
  });

  test("the team ID field is a number input, so non-numeric text can't be entered at all", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    const input = page.getByPlaceholder("e.g. 1234567");
    await expect(input).toHaveAttribute("type", "number");
    // Playwright's .fill() itself refuses to type non-numeric text into a
    // number input — which is the browser-level guard this test is
    // checking for, just surfaced as a Playwright API error instead of a
    // page-visible one. Assert that refusal directly rather than trying to
    // observe a DOM state that's unreachable through fill().
    await expect(input.fill("not-a-number")).rejects.toThrow(/Cannot type text into input\[type=number\]/);
  });
});

test.describe("onboarding — manual entry path", () => {
  test("rejects submission with zero players selected", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByRole("button", { name: "Enter my squad manually" }).click();
    await page.locator('input[name="bank"]').fill("1.0");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Select exactly 15 players (got 0)")).toBeVisible({ timeout: 10_000 });
  });

  test("position quota counters update as players are added and removed", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByRole("button", { name: "Enter my squad manually" }).click();

    await expect(page.getByText("Total 0/15")).toBeVisible();

    const search = page.getByPlaceholder("Search a player to add…");
    await search.fill("a");
    const firstResult = page.locator("ul button").first();
    const label = await firstResult.textContent();
    await firstResult.click();

    await expect(page.getByText("Total 1/15")).toBeVisible();
    expect(label).toBeTruthy();

    // Remove it again via the ✕ button next to the selected player.
    await page.getByRole("button", { name: `Remove ${label!.split(" (")[0]}` }).click();
    await expect(page.getByText("Total 0/15")).toBeVisible();
  });

  test("clears the leftover team-ID error when switching to manual entry", async ({ page }) => {
    await page.goto("/onboarding");
    // Trigger the team-ID error first.
    await page.getByPlaceholder("e.g. 1234567").fill("999999999");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Couldn't find that FPL team ID")).toBeVisible({ timeout: 15_000 });

    // Switching tabs should clear it (regression test for a bug found
    // during manual QA where the stale error persisted across tabs).
    await page.getByRole("button", { name: "Enter my squad manually" }).click();
    await expect(page.getByText("Couldn't find that FPL team ID")).not.toBeVisible();
  });
});
