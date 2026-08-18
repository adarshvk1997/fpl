import { test, expect } from "@playwright/test";

// Content-free smoke tests — assert each page renders its header without
// throwing, regardless of what's actually in the database right now. Tests
// that assert on specific squad/transfer/news content would be fragile
// against a live single-tenant app whose data changes over the season; this
// is the level of coverage that stays true no matter what state the app is
// actually in.
const PAGES: [path: string, heading: string | RegExp][] = [
  ["/dashboard", /Gameweek \d+/],
  ["/transfers", /Transfers — Gameweek \d+/],
  ["/news", "News feed"],
  ["/history", "Gameweek history"],
  ["/settings", "Settings"],
];

for (const [path, heading] of PAGES) {
  test(`${path} loads and renders its heading`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.ok()).toBe(true);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  });
}

test("root path redirects straight to the dashboard (no login gate)", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("nav links move between all main pages", async ({ page }) => {
  await page.goto("/dashboard");
  for (const label of ["Transfers", "News", "History", "Settings", "Dashboard"]) {
    await page.getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`/${label.toLowerCase()}$`));
  }
});
