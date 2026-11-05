import path from "node:path";
import { expect, test } from "@playwright/test";
import { demoLogin } from "./helpers";

test("seller: dashboard → create listing with photo → publish → manage booking → handover → earnings", async ({ page }) => {
  await demoLogin(page, "seller");
  await expect(page.getByText("Raman Gear Hub").first()).toBeVisible();
  await expect(page.getByText("Gross transaction value")).toBeVisible();

  // Create a listing through the multi-step wizard.
  await page.goto("/seller/listings/new");
  await page.getByLabel("Title").fill("Rode VideoMic shotgun microphone");
  await page.getByLabel("Description").fill("On-camera shotgun mic with deadcat windshield and cold-shoe mount. Great for vlogs and interviews.");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Category").selectOption({ label: "Cameras & Photography" });
  await page.getByText("Like new", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByTestId("listing-photo-input").setInputFiles(path.resolve("public/images/products/gopro.webp"));
  await expect(page.getByAltText("Photo 1")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Daily rate (₹)").fill("150");
  await page.getByLabel("Refundable deposit (₹)").fill("1500");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Rode VideoMic shotgun microphone")).toBeVisible();
  await page.getByTestId("publish-listing").click();
  await expect(page).toHaveURL(/\/seller\/listings$/);
  await expect(page.getByRole("link", { name: "Rode VideoMic shotgun microphone" })).toBeVisible();

  // Confirm a pending rental request.
  await page.goto("/seller/bookings?tab=requested");
  await page.locator('a[href^="/seller/bookings/"]').first().click();
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByText("Confirmed").first()).toBeVisible();

  // Record handover on the booking that starts today.
  await page.goto("/seller/bookings?tab=confirmed");
  await page.getByText("Canon EOS 80D").first().click();
  await page.getByLabel("Condition notes").fill("Body, lens, battery and bag handed over. Tested together.");
  await page.getByTestId("confirm-step").click();
  await expect(page.getByText("Body, lens, battery and bag handed over.")).toBeVisible();

  await page.goto("/seller/earnings");
  await expect(page.getByRole("heading", { name: "Earnings" })).toBeVisible();
  await expect(page.getByText("Sales history")).toBeVisible();
});
