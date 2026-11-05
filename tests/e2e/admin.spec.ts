import { expect, test } from "@playwright/test";
import { demoLogin } from "./helpers";

test("admin: dashboard → verify seller → moderate listing → review dispute → resolve", async ({ page }) => {
  await demoLogin(page, "admin");
  await expect(page.getByRole("heading", { name: "Platform overview" })).toBeVisible();

  await page.goto("/admin/verification");
  await expect(page.getByText("Rahul's Outdoor Kit")).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Queue is clear")).toBeVisible();

  await page.goto("/admin/listings?q=Bean");
  await page.getByRole("button", { name: "Suspend" }).first().click();
  await page.getByRole("dialog").locator("textarea").fill("Listing photos do not match the item.");
  await page.getByRole("dialog").getByRole("button", { name: "Suspend" }).click();
  await expect(page.getByText("Suspended").first()).toBeVisible();

  await page.goto("/admin/disputes");
  await page.getByRole("row", { name: /Payment issue/ }).getByRole("link").first().click();
  await page.getByRole("button", { name: "Start review" }).click();
  await expect(page.getByText("Under review").first()).toBeVisible();
  await page.getByLabel("Resolution note (shared with the parties)").fill("Checked the receipt: the service fee matches the 2% shown at checkout. No refund due.");
  await page.getByLabel("Outcome").selectOption("REJECTED");
  await page.getByRole("button", { name: "Save decision" }).click();
  await expect(page.getByText("Closed — no action").first()).toBeVisible();

  await page.goto("/admin/audit-logs?q=dispute");
  await expect(page.getByText("dispute.resolved").first()).toBeVisible();
});

test("non-admins are kept out of the admin console", async ({ page }) => {
  await demoLogin(page, "customer");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/account\?denied=admin/);
});
