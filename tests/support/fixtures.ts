import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, formatDayISO, todayIST } from "@/lib/dates";
import type { Actor } from "@/lib/permissions";
import { wipe } from "@/modules/demo/seed";

export const testDb = new PrismaClient();

let n = 0;
const uniq = () => `${Date.now().toString(36)}${(n++).toString(36)}`;
let hash: string | null = null;

export async function resetDb() {
  await wipe(testDb);
  await testDb.platformSetting.create({ data: { id: 1, commissionBps: 800, customerFeeBps: 200, holdMinutes: 15 } });
}

export async function makeUser(opts: { admin?: boolean; verified?: boolean } = {}) {
  hash ??= await bcrypt.hash("Password123", 4);
  const user = await testDb.user.create({
    data: { email: `u${uniq()}@test.dev`, name: "Test User", passwordHash: hash, role: opts.admin ? "ADMIN" : "CUSTOMER", emailVerifiedAt: opts.verified === false ? null : new Date() },
  });
  return { user, actor: { id: user.id, role: user.role, sellerId: null } as Actor };
}

export async function makeSeller() {
  const { user } = await makeUser();
  const seller = await testDb.sellerProfile.create({ data: { userId: user.id, displayName: "Test Seller", area: "Peelamedu", pincode: "641004", phone: "9840012345", verificationStatus: "VERIFIED" } });
  return { user, seller, actor: { id: user.id, role: user.role, sellerId: seller.id } as Actor };
}

export async function makeCategory() {
  return testDb.category.upsert({ where: { slug: "test-cat" }, update: {}, create: { slug: "test-cat", name: "Cameras Test", description: "d", imageUrl: "/x.webp" } });
}

export async function makeListing(sellerId: string, overrides: Partial<{ stockQuantity: number; rentalEnabled: boolean; purchaseEnabled: boolean; dailyRatePaise: number; depositPaise: number; salePricePaise: number; title: string; status: "ACTIVE" | "DRAFT" }> = {}) {
  const cat = await makeCategory();
  return testDb.listing.create({
    data: {
      sellerId,
      categoryId: cat.id,
      title: overrides.title ?? "Canon DSLR test camera",
      description: "A test listing used by the integration suite.",
      condition: "GOOD",
      area: "Peelamedu",
      pincode: "641004",
      rentalEnabled: overrides.rentalEnabled ?? true,
      purchaseEnabled: overrides.purchaseEnabled ?? false,
      dailyRatePaise: overrides.dailyRatePaise ?? 50_000,
      depositPaise: overrides.depositPaise ?? 200_000,
      salePricePaise: overrides.salePricePaise ?? (overrides.purchaseEnabled ? 1_000_000 : null),
      stockQuantity: overrides.stockQuantity ?? 1,
      status: overrides.status ?? "ACTIVE",
      images: { create: [{ url: "/images/products/canon-80d.webp", alt: "test" }] },
    },
  });
}

/** ISO date `offset` days from today (India). */
export const day = (offset: number) => formatDayISO(addDays(todayIST(), offset));
export const key = () => `test_${uniq()}_idempotency`;
