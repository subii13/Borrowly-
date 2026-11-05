import { expect, test } from "@playwright/test";
import { demoLogin, openListing, pickDates } from "./helpers";

test("customer rental: login → explore → search → product → dates → checkout → demo payment → tracking", async ({ page }) => {
  await demoLogin(page, "customer");
  await page.getByRole("link", { name: "Explore", exact: true }).first().click();
  await expect(page).toHaveURL(/\/explore/);
  await openListing(page, "projection screen");
  await pickDates(page, 2);
  await expect(page.getByText("Total due")).toBeVisible();
  await page.getByRole("button", { name: "Reserve these dates" }).click();

  await expect(page).toHaveURL(/\/checkout\/rent\//);
  await expect(page.getByText("DEMO PAYMENT — No real money will be charged.")).toBeVisible();
  await page.getByTestId("pay-button").click();

  await expect(page).toHaveURL(/\/account\/bookings\/.+\?new=1/);
  await expect(page.getByText("Booking request sent")).toBeVisible();
  await expect(page.getByText("Awaiting seller").first()).toBeVisible();
  await expect(page.getByText("Paid", { exact: true })).toBeVisible();

  await page.goto("/account/bookings?tab=upcoming");
  await expect(page.getByText("120\" Tripod Projection Screen").first()).toBeVisible();
});

test("customer purchase: login → product → buy → checkout → demo payment → confirmation", async ({ page }) => {
  await demoLogin(page, "customer");
  await openListing(page, "microscope");
  await page.getByRole("tab", { name: /Buy/ }).click();
  await page.getByRole("link", { name: "Buy now" }).click();
  await expect(page).toHaveURL(/\/checkout\/buy\//);
  await page.getByTestId("pay-button").click();
  await expect(page).toHaveURL(/\/account\/purchases\/.+\?new=1/);
  await expect(page.getByText("Purchase confirmed")).toBeVisible();
  await expect(page.getByText("Order placed").first()).toBeVisible();
});

test("declined demo payment does not create a confirmed booking", async ({ page }) => {
  await demoLogin(page, "customer");
  await openListing(page, "laser distance meter");
  await pickDates(page, 1);
  await page.getByRole("button", { name: "Reserve these dates" }).click();
  await page.getByTestId("outcome-decline").check();
  await page.getByTestId("pay-button").click();
  await expect(page).toHaveURL(/\/account\/bookings\//);
  await expect(page.getByText("Payment failed").first()).toBeVisible();
});
