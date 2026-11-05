import { expect, test } from "@playwright/test";
import { demoLogin } from "./helpers";

// Regenerates the README screenshots and checks key pages have no horizontal overflow on a phone.
// Run with: SCREENSHOTS=1 npx playwright test tests/e2e/screenshots.spec.ts
test.skip(!process.env.SCREENSHOTS, "set SCREENSHOTS=1 to regenerate screenshots");

const shot = (name: string) => ({ path: `docs/screenshots/${name}.png`, fullPage: false });

test("desktop screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.screenshot(shot("home"));
  await page.goto("/explore?q=camera");
  await page.waitForLoadState("networkidle");
  await page.screenshot(shot("explore"));
  await page.locator('a[href^="/listings/"]').first().click();
  await page.waitForLoadState("networkidle");
  await page.screenshot(shot("product"));
  await demoLogin(page, "seller");
  await page.waitForLoadState("networkidle");
  await page.screenshot(shot("seller"));
  await demoLogin(page, "admin");
  await page.waitForLoadState("networkidle");
  await page.screenshot(shot("admin"));
});

test("mobile layouts do not overflow horizontally", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ["/", "/explore", "/categories/electronics", "/demo"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
  await page.goto("/");
  await page.screenshot({ path: "docs/screenshots/mobile-home.png" });
  await page.locator('a[href^="/listings/"]').first().click();
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), "product").toBeLessThanOrEqual(0);
  await page.screenshot({ path: "docs/screenshots/mobile-product.png" });
  const check = async (label: string) => expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), label).toBeLessThanOrEqual(0);
  await demoLogin(page, "seller");
  await check("seller dashboard");
  for (const p of ["/seller/listings", "/seller/bookings", "/seller/earnings", "/seller/listings/new"]) {
    await page.goto(p);
    await check(p);
  }
  await page.goto("/seller/bookings?tab=active");
  await page.locator('a[href^="/seller/bookings/c"]').first().click();
  await page.waitForLoadState("networkidle");
  await check("booking detail");
  await page.screenshot({ path: "docs/screenshots/mobile-booking.png" });
  await demoLogin(page, "customer");
  for (const p of ["/account", "/account/bookings", "/account/transactions"]) {
    await page.goto(p);
    await check(p);
  }
  await demoLogin(page, "admin");
  for (const p of ["/admin", "/admin/bookings", "/admin/disputes", "/admin/reports"]) {
    await page.goto(p);
    await check(p);
  }
});
