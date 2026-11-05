import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { processImage, sniffImageType } from "@/lib/storage";
import { assertAdmin, partyOf, requireParty, type Actor } from "@/lib/permissions";
import { hit } from "@/lib/rate-limit";
import { listingSchema, registerSchema } from "@/lib/validation";
import { toSafeError, AppError } from "@/lib/errors";

const customer: Actor = { id: "c1", role: "CUSTOMER", sellerId: null };
const seller: Actor = { id: "s1", role: "CUSTOMER", sellerId: "sp1" };
const stranger: Actor = { id: "x", role: "CUSTOMER", sellerId: "other" };
const admin: Actor = { id: "a", role: "ADMIN", sellerId: null };
const txn = { customerId: "c1", sellerId: "sp1" };

describe("authorization helpers", () => {
  it("identifies transaction parties", () => {
    expect(partyOf(customer, txn)).toBe("customer");
    expect(partyOf(seller, txn)).toBe("seller");
    expect(partyOf(admin, txn)).toBe("admin");
    expect(partyOf(stranger, txn)).toBeNull();
  });

  it("hides other people's records as NOT_FOUND", () => {
    expect(() => requireParty(stranger, txn)).toThrowError(expect.objectContaining({ code: "NOT_FOUND" }));
  });

  it("requires the ADMIN role from the server-side actor", () => {
    expect(() => assertAdmin(customer)).toThrowError(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(() => assertAdmin(null)).toThrowError(expect.objectContaining({ code: "UNAUTHENTICATED" }));
    expect(() => assertAdmin(admin)).not.toThrow();
  });
});

describe("upload validation", () => {
  it("detects real image types from magic bytes", async () => {
    const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#fff" } }).png().toBuffer();
    expect(sniffImageType(png)).toBe("image/png");
    expect(sniffImageType(Buffer.from("<script>alert(1)</script>....."))).toBeNull();
  });

  it("rejects non-images and re-encodes valid images to WebP", async () => {
    await expect(processImage(Buffer.from("GIF89a not really an image at all"))).rejects.toThrow(/JPEG, PNG or WebP/);
    const jpg = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#245c46" } }).jpeg().toBuffer();
    const out = await processImage(jpg);
    expect(out.contentType).toBe("image/webp");
    expect(Math.max(out.width, out.height)).toBeLessThanOrEqual(1600);
  });

  it("rejects files over 5 MB", async () => {
    await expect(processImage(Buffer.alloc(5 * 1024 * 1024 + 1))).rejects.toThrow(/5 MB/);
  });
});

describe("rate limiting", () => {
  it("blocks after the limit within the window", () => {
    const k = `t-${Math.random()}`;
    expect(hit(k, 2, 1000, 0)).toBe(true);
    expect(hit(k, 2, 1000, 1)).toBe(true);
    expect(hit(k, 2, 1000, 2)).toBe(false);
    expect(hit(k, 2, 1000, 1500)).toBe(true);
  });
});

describe("validation", () => {
  it("enforces password strength on registration", () => {
    expect(registerSchema.safeParse({ name: "A B", email: "a@b.co", password: "short" }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "A B", email: "a@b.co", password: "longpassword" }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "A B", email: "A@B.co", password: "longpass1" }).data?.email).toBe("a@b.co");
  });

  it("requires prices for the enabled modes", () => {
    const base = { title: "Test camera kit", description: "x".repeat(40), categoryId: "c", condition: "GOOD", images: [{ url: "/x" }], stockQuantity: 1, minRentalDays: 1, maxRentalDays: 5, area: "Peelamedu", pincode: "641004", publish: true };
    expect(listingSchema.safeParse({ ...base, rentalEnabled: false, purchaseEnabled: false }).success).toBe(false);
    expect(listingSchema.safeParse({ ...base, rentalEnabled: true, purchaseEnabled: false, dailyRate: "" }).success).toBe(false);
    expect(listingSchema.safeParse({ ...base, rentalEnabled: true, purchaseEnabled: false, dailyRate: "200", deposit: "0" }).success).toBe(true);
    expect(listingSchema.safeParse({ ...base, rentalEnabled: false, purchaseEnabled: true, salePrice: "999.50" }).success).toBe(true);
  });
});

describe("safe errors", () => {
  it("never leaks unexpected error details", () => {
    const orig = console.error;
    console.error = () => {};
    expect(toSafeError(new Error("relation \"User\" password column leaked"))).toEqual({ ok: false, error: "Something went wrong. Please try again.", code: "INTERNAL" });
    console.error = orig;
    expect(toSafeError(new AppError("CONFLICT", "Already done"))).toMatchObject({ error: "Already done", code: "CONFLICT" });
  });
});
