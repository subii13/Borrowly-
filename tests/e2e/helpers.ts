import { expect, type Page } from "@playwright/test";

export async function demoLogin(page: Page, role: "customer" | "seller" | "admin") {
  await page.context().clearCookies();
  await page.goto("/demo");
  await page.getByTestId(`demo-${role}`).click();
  await expect(page).toHaveURL(role === "admin" ? /\/admin$/ : role === "seller" ? /\/seller$/ : /\/account$/);
}

/** Opens the first search result for a query from the Explore page. */
export async function openListing(page: Page, query: string) {
  await page.goto(`/explore?q=${encodeURIComponent(query)}`);
  await page.locator('a[href^="/listings/"]').first().click();
  await expect(page).toHaveURL(/\/listings\//);
}

/** Picks the first fully free run of `nights` days on the booking calendar. */
export async function pickDates(page: Page, nights: number) {
  const grid = page.getByRole("grid", { name: "Choose rental dates" });
  await expect(grid.locator("button:not([disabled])").first()).toBeVisible();
  const labels = await grid.locator("button:not([disabled])").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
  const free = labels.filter((l) => !l.includes("booked"));
  // Skip today so the booking is clearly in the future.
  const start = free[2];
  const end = new Date(`${start}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + nights);
  const endIso = end.toISOString().slice(0, 10);
  await grid.getByRole("button", { name: start, exact: true }).click();
  await grid.getByRole("button", { name: endIso, exact: true }).click();
  return { start, end: endIso };
}
