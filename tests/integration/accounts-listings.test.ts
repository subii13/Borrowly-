import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { authenticate, registerUser, requestPasswordReset, resetPassword, verifyEmail } from "@/modules/auth/service";
import { createListing, moderateListing, setListingStatus } from "@/modules/listings/service";
import { searchListings } from "@/modules/listings/search";
import { becomeSeller, reviewSeller, submitVerification } from "@/modules/sellers/service";
import { setUserStatus, updateSettings } from "@/modules/admin/service";
import { seedDemo } from "@/modules/demo/seed";
import { makeCategory, makeListing, makeSeller, makeUser, resetDb, testDb as db } from "../support/fixtures";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

const tokenFrom = (body: string) => /token=([A-Za-z0-9_-]+)/.exec(body)![1];

describe("authentication", () => {
  it("registers, verifies email, logs in and resets the password", async () => {
    const user = await registerUser(db, { name: "Asha Test", email: "Asha@Example.com", password: "Secret123" });
    expect(user.email).toBe("asha@example.com");
    expect(user.passwordHash).not.toContain("Secret123");
    await expect(registerUser(db, { name: "Dup", email: "asha@example.com", password: "Secret123" })).rejects.toMatchObject({ code: "CONFLICT" });

    const verifyMail = await db.devMessage.findFirstOrThrow({ where: { to: "asha@example.com", subject: { contains: "Verify" } } });
    await verifyEmail(db, tokenFrom(verifyMail.body));
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerifiedAt).not.toBeNull();
    await expect(verifyEmail(db, tokenFrom(verifyMail.body))).rejects.toMatchObject({ code: "VALIDATION" });

    await expect(authenticate(db, { email: "asha@example.com", password: "wrongpass1" })).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await expect(authenticate(db, { email: "nobody@example.com", password: "Secret123" })).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await expect(authenticate(db, { email: "asha@example.com", password: "Secret123" })).resolves.toMatchObject({ id: user.id });

    await requestPasswordReset(db, { email: "asha@example.com" });
    await requestPasswordReset(db, { email: "nobody@example.com" }); // no error, no disclosure
    const resetMail = await db.devMessage.findFirstOrThrow({ where: { subject: { contains: "Reset" } } });
    await resetPassword(db, { token: tokenFrom(resetMail.body), password: "NewSecret456" });
    await expect(authenticate(db, { email: "asha@example.com", password: "NewSecret456" })).resolves.toBeTruthy();
  });

  it("blocks suspended users and only admins can suspend", async () => {
    const admin = await makeUser({ admin: true });
    const u = await makeUser();
    const other = await makeUser();
    await expect(setUserStatus(db, other.actor, u.user.id, "SUSPENDED")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await setUserStatus(db, admin.actor, u.user.id, "SUSPENDED");
    await expect(authenticate(db, { email: u.user.email, password: "Password123" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("sellers and listings", () => {
  it("creates a seller profile, then a listing from the user's own uploads only", async () => {
    const { actor } = await makeUser();
    const cat = await makeCategory();
    const input = { title: "Bosch drill kit", description: "Cordless drill with two batteries and a bit set, works well.", categoryId: cat.id, condition: "GOOD", rentalEnabled: true, purchaseEnabled: false, dailyRate: "180", deposit: "1500", stockQuantity: 1, minRentalDays: 1, maxRentalDays: 10, area: "Gandhipuram", pincode: "641012", publish: true };
    await expect(createListing(db, actor, { ...input, images: [{ url: "/x", storageKey: `listings/${actor.id}/a.webp` }] })).rejects.toMatchObject({ code: "FORBIDDEN" });

    const seller = await becomeSeller(db, actor, { displayName: "Drill Hub", sellerType: "INDIVIDUAL", area: "Gandhipuram", pincode: "641012" });
    const sellerActor = { ...actor, sellerId: seller.id };
    await expect(createListing(db, sellerActor, { ...input, images: [{ url: "/x", storageKey: "listings/someone-else/a.webp" }] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const l = await createListing(db, sellerActor, { ...input, images: [{ url: "https://evil.example/x.png", storageKey: `listings/${actor.id}/a.webp` }] });
    expect(l).toMatchObject({ status: "ACTIVE", dailyRatePaise: 18_000, depositPaise: 150_000 });
    const img = await db.listingImage.findFirstOrThrow({ where: { listingId: l.id } });
    expect(img.url).not.toContain("evil.example"); // URL derived server-side from the storage key
  });

  it("enforces ownership on listing changes and admin-only moderation", async () => {
    const a = await makeSeller();
    const b = await makeSeller();
    const admin = await makeUser({ admin: true });
    const listing = await makeListing(a.seller.id);
    await expect(setListingStatus(db, b.actor, listing.id, "INACTIVE")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(moderateListing(db, a.actor, listing.id, "suspend", "Self moderation")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await moderateListing(db, admin.actor, listing.id, "suspend", "Prohibited item");
    await expect(setListingStatus(db, a.actor, listing.id, "ACTIVE")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requires verified email and phone before seller verification, and admin review", async () => {
    const { actor } = await makeUser({ verified: false });
    const admin = await makeUser({ admin: true });
    const seller = await becomeSeller(db, actor, { displayName: "New Shop", sellerType: "BUSINESS", area: "Peelamedu", pincode: "641004", phone: "9840099999" });
    const sa = { ...actor, sellerId: seller.id };
    await expect(submitVerification(db, sa, "")).rejects.toMatchObject({ code: "VALIDATION" });
    await db.user.update({ where: { id: actor.id }, data: { emailVerifiedAt: new Date() } });
    await db.sellerProfile.update({ where: { id: seller.id }, data: { phoneVerifiedAt: new Date() } });
    await submitVerification(db, sa, "Camera shop");
    await expect(reviewSeller(db, sa, seller.id, "VERIFIED", "")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await reviewSeller(db, admin.actor, seller.id, "VERIFIED", "Looks good");
    expect((await db.sellerProfile.findUniqueOrThrow({ where: { id: seller.id } })).verificationStatus).toBe("VERIFIED");
  });

  it("keeps commission within 5–10% and admin-only", async () => {
    const admin = await makeUser({ admin: true });
    const u = await makeUser();
    await expect(updateSettings(db, u.actor, { commissionBps: 900, customerFeeBps: 200, holdMinutes: 15 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(updateSettings(db, admin.actor, { commissionBps: 2500, customerFeeBps: 200, holdMinutes: 15 })).rejects.toThrow();
    await updateSettings(db, admin.actor, { commissionBps: 1000, customerFeeBps: 100, holdMinutes: 10 });
    expect((await db.platformSetting.findUniqueOrThrow({ where: { id: 1 } })).commissionBps).toBe(1000);
  });
});

describe("search over seeded demo data", () => {
  it("seeds the demo catalogue and filters by query, category, area, mode and price", async () => {
    await seedDemo(db);
    expect(await db.listing.count()).toBeGreaterThanOrEqual(30);
    expect(await db.category.count()).toBe(9);

    const cam = await searchListings(db, { q: "camera" });
    expect(cam.total).toBeGreaterThan(0);
    expect(cam.items[0].title.toLowerCase()).toMatch(/camera|canon|sony|gopro/);

    const tools = await searchListings(db, { category: "tools-diy" });
    expect(tools.items.every((l) => l.category.slug === "tools-diy")).toBe(true);

    const rs = await searchListings(db, { area: "RS Puram" });
    expect(rs.items.every((l) => l.area === "RS Puram")).toBe(true);

    const buy = await searchListings(db, { mode: "buy", sort: "price_asc" });
    expect(buy.items.every((l) => l.purchaseEnabled)).toBe(true);

    const cheap = await searchListings(db, { mode: "rent", max: 150 });
    expect(cheap.items.every((l) => (l.dailyRatePaise ?? 0) <= 15_000)).toBe(true);

    const injection = await searchListings(db, { q: "'; DROP TABLE \"Listing\"; --" });
    expect(injection.total).toBe(0);
    expect(await db.listing.count()).toBeGreaterThanOrEqual(30);
  });
});
