import type { BookingStatus, Prisma, PrismaClient, PurchaseStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, todayIST } from "@/lib/dates";
import { referenceCode } from "@/lib/crypto";
import { purchaseQuote, rentalQuote } from "@/modules/pricing/pricing";
import { categories, DEMO_PASSWORD, listings, sellers, users, type DemoUserKey, type SellerKey } from "./catalogue";

const SETTINGS = { commissionBps: 800, customerFeeBps: 200 };

/** Deletes every row. Order respects foreign keys. */
export async function wipe(db: PrismaClient) {
  await db.$transaction([
    db.auditLog.deleteMany(),
    db.notification.deleteMany(),
    db.disputeEvidence.deleteMany(),
    db.refund.deleteMany(),
    db.dispute.deleteMany(),
    db.review.deleteMany(),
    db.handoverEvidence.deleteMany(),
    db.handover.deleteMany(),
    db.payment.deleteMany(),
    db.rentalBooking.deleteMany(),
    db.bookingHold.deleteMany(),
    db.purchaseOrder.deleteMany(),
    db.favourite.deleteMany(),
    db.listingImage.deleteMany(),
    db.listing.deleteMany(),
    db.category.deleteMany(),
    db.sellerProfile.deleteMany(),
    db.verificationToken.deleteMany(),
    db.session.deleteMany(),
    db.devMessage.deleteMany(),
    db.userProfile.deleteMany(),
    db.user.deleteMany(),
    db.platformSetting.deleteMany(),
  ]);
}

/**
 * Restores the full demonstration dataset. Dates are relative to "today" so active rentals,
 * upcoming returns and recent earnings always look current.
 */
export async function seedDemo(db: PrismaClient, opts: { log?: (m: string) => void } = {}) {
  const log = opts.log ?? (() => {});
  const today = todayIST();
  const day = (n: number) => addDays(today, n);
  const at = (n: number, hour = 11) => new Date(day(n).getTime() + (hour - 5.5) * 3_600_000);

  await wipe(db);
  await db.platformSetting.create({ data: { id: 1, ...SETTINGS, holdMinutes: 15 } });

  // Users ---------------------------------------------------------------------
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const uid = {} as Record<DemoUserKey, string>;
  for (const u of users) {
    const created = await db.user.create({
      data: {
        email: u.email,
        name: u.name,
        role: u.role ?? "CUSTOMER",
        passwordHash,
        isDemo: true,
        emailVerifiedAt: at(-120),
        createdAt: at(-150 + users.indexOf(u)),
        profile: { create: { phone: u.phone, area: u.area } },
      },
    });
    uid[u.key] = created.id;
  }
  log(`users: ${users.length}`);

  const sid = {} as Record<SellerKey, string>;
  for (const [key, s] of Object.entries(sellers) as [SellerKey, (typeof sellers)[SellerKey]][]) {
    const u = users.find((x) => x.key === key)!;
    const created = await db.sellerProfile.create({
      data: {
        userId: uid[key],
        displayName: s.displayName,
        sellerType: s.type,
        bio: s.bio,
        area: s.area,
        pincode: s.pincode,
        pickupAddress: s.pickupAddress,
        phone: u.phone,
        phoneVerifiedAt: s.status === "NOT_SUBMITTED" ? null : at(-110),
        verificationStatus: s.status,
        verificationSubmittedAt: s.status === "NOT_SUBMITTED" ? null : at(-100),
        verificationNote: s.status === "NOT_SUBMITTED" ? null : "Demo verification submission.",
        verifiedAt: s.status === "VERIFIED" ? at(-95) : null,
        reviewNote: s.reviewNote ?? (s.status === "VERIFIED" ? "Demo verification: email and phone confirmed. Not an identity check." : null),
        reviewedById: ["VERIFIED", "REJECTED"].includes(s.status) ? uid.admin : null,
        createdAt: at(-140),
      },
    });
    sid[key] = created.id;
  }

  // Catalogue -----------------------------------------------------------------
  const cid: Record<string, string> = {};
  for (const [i, c] of categories.entries()) {
    const created = await db.category.create({ data: { slug: c.slug, name: c.name, description: c.description, imageUrl: `/images/categories/${c.image}.webp`, sortOrder: i } });
    cid[c.slug] = created.id;
  }

  const lid: Record<string, { id: string; sellerId: string; dailyRatePaise: number | null; depositPaise: number | null; salePricePaise: number | null; title: string }> = {};
  for (const [i, l] of listings.entries()) {
    const s = sellers[l.seller];
    const created = await db.listing.create({
      data: {
        sellerId: sid[l.seller],
        categoryId: cid[l.category],
        title: l.title,
        description: l.description,
        brand: l.brand ?? null,
        model: l.model ?? null,
        condition: l.condition,
        area: s.area,
        pincode: s.pincode,
        rentalEnabled: l.rent !== undefined,
        purchaseEnabled: l.sale !== undefined,
        dailyRatePaise: l.rent !== undefined ? l.rent * 100 : null,
        depositPaise: l.rent !== undefined ? (l.deposit ?? 0) * 100 : null,
        salePricePaise: l.sale !== undefined ? l.sale * 100 : null,
        stockQuantity: l.stock ?? 1,
        minRentalDays: l.minDays ?? 1,
        maxRentalDays: 30,
        status: "ACTIVE",
        isDemo: true,
        publishedAt: at(-90 + i),
        createdAt: at(-90 + i),
        images: {
          create: [
            { url: `/images/products/${l.key}.webp`, alt: l.title, sortOrder: 0 },
            { url: `/images/products/${l.key}-detail.webp`, alt: `${l.title} — detail`, sortOrder: 1 },
          ],
        },
      },
    });
    lid[l.key] = created;
  }
  log(`listings: ${listings.length}`);

  // Transactions --------------------------------------------------------------
  type BookingSpec = {
    listing: string;
    customer: DemoUserKey;
    start: number;
    end: number;
    status: BookingStatus;
    quantity?: number;
    review?: { rating: number; comment: string };
    handover?: "seller" | "both";
    returned?: "customer" | "both";
    note?: string;
  };

  const sellerUserOf = (sellerId: string) => (Object.entries(sid).find(([, v]) => v === sellerId)![0] as SellerKey);

  async function booking(spec: BookingSpec) {
    const l = lid[spec.listing];
    const q = rentalQuote({ dailyRatePaise: l.dailyRatePaise!, depositPaise: l.depositPaise ?? 0, days: spec.end - spec.start, quantity: spec.quantity ?? 1, ...SETTINGS });
    const createdAt = at(Math.min(spec.start - 3, -1), 10);
    const paid = !["PENDING_PAYMENT", "PAYMENT_FAILED"].includes(spec.status);
    const started = ["ACTIVE", "RETURN_PENDING", "COMPLETED"].includes(spec.status);
    const sellerUser = uid[sellerUserOf(l.sellerId)];
    const b = await db.rentalBooking.create({
      data: {
        code: referenceCode("BR"),
        listingId: l.id,
        customerId: uid[spec.customer],
        sellerId: l.sellerId,
        startDate: day(spec.start),
        endDate: day(spec.end),
        days: q.days,
        quantity: q.quantity,
        dailyRatePaise: q.dailyRatePaise,
        rentalSubtotalPaise: q.rentalSubtotalPaise,
        depositPaise: q.depositPaise,
        serviceFeePaise: q.serviceFeePaise,
        totalPaise: q.totalPaise,
        customerFeeBps: q.customerFeeBps,
        commissionBps: q.commissionBps,
        commissionPaise: q.commissionPaise,
        sellerNetPaise: q.sellerNetPaise,
        status: spec.status,
        idempotencyKey: `seed_${referenceCode("K", 12)}`,
        sellerConfirmedAt: ["CONFIRMED", "ACTIVE", "RETURN_PENDING", "COMPLETED"].includes(spec.status) ? at(spec.start - 2) : null,
        handedOverAt: started ? at(spec.start, 10) : null,
        returnedAt: ["RETURN_PENDING", "COMPLETED"].includes(spec.status) ? at(spec.end, 18) : null,
        completedAt: spec.status === "COMPLETED" ? at(spec.end, 19) : null,
        cancelledAt: ["CANCELLED", "REJECTED"].includes(spec.status) ? at(spec.start - 2) : null,
        cancelReason: spec.status === "CANCELLED" ? "Plans changed — trip postponed." : spec.status === "PAYMENT_FAILED" ? "Simulated decline: the demo card was declined." : null,
        isDemo: true,
        createdAt,
      },
    });
    const payment = await db.payment.create({
      data: {
        provider: "demo",
        providerRef: paid || spec.status === "CANCELLED" ? `demo_pay_seed_${b.code}` : null,
        amountPaise: b.totalPaise,
        status: spec.status === "PAYMENT_FAILED" ? "FAILED" : spec.status === "CANCELLED" || spec.status === "REJECTED" ? "REFUNDED" : "SUCCESS",
        failureReason: spec.status === "PAYMENT_FAILED" ? "Simulated decline: the demo card was declined." : null,
        payerId: uid[spec.customer],
        bookingId: b.id,
        idempotencyKey: `pay_${b.idempotencyKey}`,
        createdAt,
      },
    });
    if (spec.status === "CANCELLED" || spec.status === "REJECTED") {
      await db.refund.create({ data: { paymentId: payment.id, type: "CANCELLATION", status: "PROCESSED", amountPaise: b.totalPaise, reason: "Booking cancelled before start", processedAt: at(spec.start - 2), createdAt: at(spec.start - 2) } });
    }
    if (started || spec.handover) {
      const both = started || spec.handover === "both";
      const h = await db.handover.create({ data: { type: "HANDOVER", bookingId: b.id, sellerConfirmedAt: at(spec.start, 10), customerConfirmedAt: both ? at(spec.start, 10) : null, createdAt: at(spec.start, 10) } });
      await db.handoverEvidence.create({ data: { handoverId: h.id, uploadedById: sellerUser, kind: "NOTE", note: spec.note ?? "Handed over in full working condition with all listed accessories. Tested together at pickup.", createdAt: at(spec.start, 10) } });
      if (both) await db.handoverEvidence.create({ data: { handoverId: h.id, uploadedById: uid[spec.customer], kind: "NOTE", note: "Received as described. Accessories checked.", createdAt: at(spec.start, 10) } });
    }
    if (["RETURN_PENDING", "COMPLETED"].includes(spec.status)) {
      const done = spec.status === "COMPLETED";
      const h = await db.handover.create({ data: { type: "RETURN", bookingId: b.id, customerConfirmedAt: at(spec.end, 18), sellerConfirmedAt: done ? at(spec.end, 19) : null, createdAt: at(spec.end, 18) } });
      await db.handoverEvidence.create({ data: { handoverId: h.id, uploadedById: uid[spec.customer], kind: "NOTE", note: "Returned on time, packed in the original bag.", createdAt: at(spec.end, 18) } });
      if (done) {
        await db.handoverEvidence.create({ data: { handoverId: h.id, uploadedById: sellerUser, kind: "NOTE", note: "Return inspected — no damage. Deposit released.", createdAt: at(spec.end, 19) } });
        if (b.depositPaise > 0) await db.refund.create({ data: { paymentId: payment.id, type: "DEPOSIT_RETURN", status: "PROCESSED", amountPaise: b.depositPaise, reason: "Deposit returned", processedAt: at(spec.end, 19), createdAt: at(spec.end, 19) } });
      }
    }
    if (spec.review) await review({ bookingId: b.id }, spec.customer, l, spec.review, at(spec.end + 1, 20));
    return b;
  }

  async function review(target: { bookingId?: string; purchaseOrderId?: string }, author: DemoUserKey, l: { id: string; sellerId: string }, r: { rating: number; comment: string }, createdAt: Date) {
    await db.review.create({ data: { ...target, authorId: uid[author], sellerId: l.sellerId, listingId: l.id, rating: r.rating, comment: r.comment, isDemo: true, createdAt } });
    await db.sellerProfile.update({ where: { id: l.sellerId }, data: { ratingSum: { increment: r.rating }, ratingCount: { increment: 1 } } });
    await db.listing.update({ where: { id: l.id }, data: { ratingSum: { increment: r.rating }, ratingCount: { increment: 1 } } });
  }

  type OrderSpec = { listing: string; customer: DemoUserKey; status: PurchaseStatus; daysAgo: number; review?: { rating: number; comment: string } };
  async function order(spec: OrderSpec) {
    const l = lid[spec.listing];
    const q = purchaseQuote({ unitPricePaise: l.salePricePaise!, quantity: 1, ...SETTINGS });
    const createdAt = at(-spec.daysAgo, 12);
    const sellerUser = uid[sellerUserOf(l.sellerId)];
    const o = await db.purchaseOrder.create({
      data: {
        code: referenceCode("BO"),
        listingId: l.id,
        customerId: uid[spec.customer],
        sellerId: l.sellerId,
        quantity: 1,
        unitPricePaise: q.unitPricePaise,
        subtotalPaise: q.subtotalPaise,
        serviceFeePaise: q.serviceFeePaise,
        totalPaise: q.totalPaise,
        customerFeeBps: q.customerFeeBps,
        commissionBps: q.commissionBps,
        commissionPaise: q.commissionPaise,
        sellerNetPaise: q.sellerNetPaise,
        status: spec.status,
        idempotencyKey: `seed_${referenceCode("K", 12)}`,
        acceptedAt: ["ACCEPTED", "HANDED_OVER", "COMPLETED"].includes(spec.status) ? at(-spec.daysAgo + 1) : null,
        handedOverAt: ["HANDED_OVER", "COMPLETED"].includes(spec.status) ? at(-spec.daysAgo + 2) : null,
        completedAt: spec.status === "COMPLETED" ? at(-spec.daysAgo + 2, 18) : null,
        isDemo: true,
        createdAt,
      },
    });
    await db.payment.create({ data: { provider: "demo", providerRef: `demo_pay_seed_${o.code}`, amountPaise: o.totalPaise, status: "SUCCESS", payerId: uid[spec.customer], purchaseOrderId: o.id, idempotencyKey: `pay_${o.idempotencyKey}`, createdAt } });
    // Sold units leave stock permanently.
    const updated = await db.listing.update({ where: { id: l.id }, data: { stockQuantity: { decrement: 1 } } });
    if (updated.stockQuantity === 0) await db.listing.update({ where: { id: l.id }, data: { status: "SOLD_OUT" } });
    if (["HANDED_OVER", "COMPLETED"].includes(spec.status)) {
      const h = await db.handover.create({ data: { type: "HANDOVER", purchaseOrderId: o.id, sellerConfirmedAt: at(-spec.daysAgo + 2), customerConfirmedAt: spec.status === "COMPLETED" ? at(-spec.daysAgo + 2, 18) : null } });
      await db.handoverEvidence.create({ data: { handoverId: h.id, uploadedById: sellerUser, kind: "NOTE", note: "Handed over with original box and charger. Buyer tested before leaving.", createdAt: at(-spec.daysAgo + 2) } });
    }
    if (spec.review) await review({ purchaseOrderId: o.id }, spec.customer, l, spec.review, at(-spec.daysAgo + 3, 20));
    return o;
  }

  // The demo customer (Arjun) — one of everything.
  const arjunActive = await booking({ listing: "sony-a7iii", customer: "arjun", start: -2, end: 2, status: "ACTIVE", note: "Body, 2 batteries, charger and 128 GB card handed over. Sensor clean." });
  await booking({ listing: "projector", customer: "arjun", start: 4, end: 6, status: "CONFIRMED" });
  await booking({ listing: "gopro", customer: "arjun", start: 7, end: 10, status: "REQUESTED" });
  await booking({ listing: "mountain-bike", customer: "arjun", start: -40, end: -37, status: "COMPLETED", review: { rating: 5, comment: "Bike was freshly serviced and Rahul even adjusted the saddle for me. Great ride to Siruvani." } });
  await booking({ listing: "tripod", customer: "arjun", start: -12, end: -10, status: "COMPLETED" }); // left un-reviewed so the review flow can be demoed
  const tentBooking = await booking({ listing: "camping-tent", customer: "arjun", start: -25, end: -23, status: "COMPLETED" });
  await booking({ listing: "pressure-washer", customer: "arjun", start: 2, end: 3, status: "CANCELLED" });
  await booking({ listing: "ps5", customer: "arjun", start: 5, end: 7, status: "PAYMENT_FAILED" });

  // Activity on the demo seller's (Raman Gear Hub) listings.
  await booking({ listing: "canon-80d", customer: "sneha", start: 0, end: 3, status: "CONFIRMED" }); // ready for handover today
  await booking({ listing: "macbook-air", customer: "irfan", start: -5, end: 1, status: "ACTIVE" });
  await booking({ listing: "softbox-kit", customer: "deepak", start: -4, end: -1, status: "RETURN_PENDING" }); // seller must confirm the return
  await booking({ listing: "sony-a7iii", customer: "kavya", start: 9, end: 12, status: "REQUESTED" });
  await booking({ listing: "projector", customer: "nithya", start: 1, end: 2, status: "REQUESTED" });

  // History for ratings, earnings charts and reports (spread over ~6 months).
  const history: [string, DemoUserKey, number, number, number, string][] = [
    ["sony-a7iii", "sneha", -160, -157, 5, "Perfect for my cousin's wedding. Karthik explained every setting patiently."],
    ["canon-80d", "kavya", -140, -136, 4, "Solid kit for a college fest. Lens had a tiny scratch but no effect on photos."],
    ["projector", "deepak", -120, -118, 5, "Bright enough even with lights on. We watched the IPL final on the terrace!"],
    ["macbook-air", "gokul", -110, -96, 5, "Rented it for my internship's first two weeks before my own laptop arrived. Flawless."],
    ["softbox-kit", "nithya", -95, -93, 4, "Good light quality for product photos for my Instagram store."],
    ["gopro", "irfan", -85, -82, 5, "Took it to Kodaikanal — the waterproof case was a lifesaver."],
    ["sony-a7iii", "gokul", -70, -66, 5, "Pristine condition. Will rent again for my next shoot."],
    ["canon-50mm", "sneha", -60, -57, 5, "Beautiful portraits. Super easy pickup in RS Puram."],
    ["cordless-drill", "kavya", -55, -54, 5, "Put up all our curtain rods in one evening. Batteries were fully charged."],
    ["pa-speaker", "deepak", -50, -49, 4, "Loud and clear for our housewarming. Setup help was appreciated."],
    ["stage-lights", "gokul", -45, -43, 5, "Made our college culturals look professional."],
    ["vacuum", "sneha", -35, -33, 4, "Great for the move-out clean. Brush head a little worn but works well."],
    ["power-toolkit", "irfan", -30, -28, 5, "Drilled through concrete easily. Tool Library is a brilliant idea."],
    ["camping-tent", "nithya", -20, -18, 4, "Stayed dry through a Valparai drizzle. One peg missing but no issue."],
    ["sewing-machine", "kavya", -18, -11, 5, "Finished all my Deepavali tailoring. Divya even gave me spare needles."],
    ["telescope", "deepak", -15, -13, 5, "Saw Jupiter's moons from our terrace in Singanallur. Kids loved it."],
    ["macbook-air", "kavya", -9, -6, 5, "Exam week lifesaver. Battery lasted all day in the library."],
    ["projector-screen", "irfan", -8, -7, 4, "Easy to set up, nice flat surface."],
    ["sony-a7iii", "deepak", -8, -5, 5, "Shot a short film with it. Two batteries were enough for a full day."],
  ];
  for (const [listing, customer, start, end, rating, comment] of history) {
    await booking({ listing, customer, start, end, status: "COMPLETED", review: { rating, comment } });
  }
  await booking({ listing: "laser-measure", customer: "irfan", start: -26, end: -25, status: "COMPLETED", review: { rating: 3, comment: "Did the job, though the battery cover was loose." } });

  // Purchases.
  await order({ listing: "calculator", customer: "arjun", status: "COMPLETED", daysAgo: 60, review: { rating: 5, comment: "Like new, with the original cover. Ananya even threw in a formula sheet." } });
  await order({ listing: "raspberry-pi", customer: "arjun", status: "HANDED_OVER", daysAgo: 2 }); // Arjun must confirm receipt
  await order({ listing: "trekking-backpack", customer: "arjun", status: "PLACED", daysAgo: 1 });
  await order({ listing: "canon-50mm", customer: "sneha", status: "PLACED", daysAgo: 1 }); // demo seller can accept
  await order({ listing: "thinkpad", customer: "irfan", status: "COMPLETED", daysAgo: 75, review: { rating: 4, comment: "Old but reliable. Keyboard is a joy. Battery is weak as described." } }); // → SOLD_OUT
  await order({ listing: "string-lights", customer: "gokul", status: "ACCEPTED", daysAgo: 3 });
  await order({ listing: "monitor", customer: "kavya", status: "COMPLETED", daysAgo: 40, review: { rating: 5, comment: "Crisp display, stand works perfectly." } });
  await order({ listing: "jbl-speaker", customer: "nithya", status: "COMPLETED", daysAgo: 100 });
  await order({ listing: "encyclopedia", customer: "gokul", status: "COMPLETED", daysAgo: 25 }); // → SOLD_OUT
  log("transactions created");

  // Disputes ------------------------------------------------------------------
  const tentPayment = await db.payment.findFirstOrThrow({ where: { bookingId: tentBooking.id } });
  const resolved = await db.dispute.create({
    data: {
      code: referenceCode("DS"),
      category: "CONDITION_MISMATCH",
      description: "One of the tent poles was cracked when we unpacked it at the campsite. We had to tape it to pitch the tent.",
      status: "RESOLVED",
      raisedById: uid.arjun,
      bookingId: tentBooking.id,
      resolutionNote: "Seller confirmed the pole was damaged before pickup. Partial refund of one day's rent approved.",
      refundDecision: "PARTIAL",
      resolvedById: uid.admin,
      resolvedAt: at(-20),
      isDemo: true,
      createdAt: at(-23, 20),
      evidence: { create: [{ uploadedById: uid.arjun, note: "Pole cracked about 10 cm from the joint. Noticed at 6 pm on arrival.", createdAt: at(-23, 20) }] },
    },
  });
  await db.refund.create({ data: { paymentId: tentPayment.id, type: "DISPUTE", status: "PENDING", amountPaise: 30000, reason: `Dispute ${resolved.code}`, disputeId: resolved.id, createdById: uid.admin, createdAt: at(-20) } });
  await db.payment.update({ where: { id: tentPayment.id }, data: { status: "REFUND_PENDING" } });

  const washerBooking = await db.rentalBooking.findFirstOrThrow({ where: { listingId: lid["laser-measure"].id, customerId: uid.irfan } });
  await db.dispute.create({
    data: {
      code: referenceCode("DS"),
      category: "DAMAGE",
      description: "The seller says the battery cover was broken on return, but it was already loose at pickup. I'd like the deduction reviewed.",
      status: "UNDER_REVIEW",
      raisedById: uid.irfan,
      bookingId: washerBooking.id,
      isDemo: true,
      createdAt: at(-24),
      evidence: { create: [{ uploadedById: uid.irfan, note: "Mentioned the loose cover in chat at pickup time.", createdAt: at(-24) }] },
    },
  });
  const monitorOrder = await db.purchaseOrder.findFirstOrThrow({ where: { listingId: lid.monitor.id } });
  await db.dispute.create({
    data: {
      code: referenceCode("DS"),
      category: "PAYMENT_ISSUE",
      description: "The service fee on my receipt looks higher than shown on the product page. Please check the calculation.",
      status: "OPEN",
      raisedById: uid.kavya,
      purchaseOrderId: monitorOrder.id,
      isDemo: true,
      createdAt: at(-2),
    },
  });

  // Favourites, notifications, audit trail ----------------------------------
  for (const key of ["macbook-air", "telescope", "pa-speaker", "ipad", "mountain-bike"]) await db.favourite.create({ data: { userId: uid.arjun, listingId: lid[key].id } });
  for (const key of ["vacuum", "camping-tent"]) await db.favourite.create({ data: { userId: uid.karthik, listingId: lid[key].id } });

  const notes: Prisma.NotificationCreateManyInput[] = [
    { userId: uid.arjun, type: "handover", title: "Rental is now active", body: `Sony Alpha 7 III: both parties confirmed the handover (${arjunActive.code}).`, link: `/account/bookings/${arjunActive.id}`, createdAt: at(-2, 10), readAt: at(-2, 12) },
    { userId: uid.arjun, type: "order.handed_over", title: "Item handed over", body: "Please confirm you received the Raspberry Pi 4 starter kit.", link: "/account/purchases", createdAt: at(0, 9) },
    { userId: uid.arjun, type: "review.invite", title: "How was your rental?", body: "Leave a review for the Manfrotto tripod.", link: "/account/bookings", createdAt: at(-10, 20) },
    { userId: uid.arjun, type: "dispute.resolved", title: "Dispute decision", body: `${resolved.code}: partial refund approved.`, link: `/account/disputes/${resolved.id}`, createdAt: at(-20), readAt: at(-19) },
    { userId: uid.karthik, type: "booking.requested", title: "New rental request", body: "Kavya requested the Sony Alpha 7 III. Please confirm or decline.", link: "/seller/bookings", createdAt: at(0, 8) },
    { userId: uid.karthik, type: "order.placed", title: "New purchase order", body: "Sneha bought the Canon EF 50mm lens. Accept the order to arrange handover.", link: "/seller/orders", createdAt: at(-1, 15) },
    { userId: uid.karthik, type: "return", title: "Return confirmed by customer", body: "Deepak returned the softbox kit. Inspect it and confirm the return.", link: "/seller/returns", createdAt: at(-1, 18) },
    { userId: uid.admin, type: "seller.verification", title: "Seller awaiting verification", body: "Rahul's Outdoor Kit submitted verification.", link: "/admin/verification", createdAt: at(-3) },
    { userId: uid.admin, type: "dispute.opened", title: "New dispute", body: "A payment-issue dispute needs review.", link: "/admin/disputes", createdAt: at(-2) },
  ];
  await db.notification.createMany({ data: notes });

  await db.auditLog.createMany({
    data: [
      { actorId: uid.admin, action: "seller.verified", entityType: "SellerProfile", entityId: sid.karthik, createdAt: at(-95) },
      { actorId: uid.admin, action: "seller.verified", entityType: "SellerProfile", entityId: sid.senthil, createdAt: at(-95) },
      { actorId: uid.admin, action: "seller.rejected", entityType: "SellerProfile", entityId: sid.vikram, metadata: { note: sellers.vikram.reviewNote }, createdAt: at(-90) },
      { actorId: uid.admin, action: "dispute.resolved", entityType: "Dispute", entityId: resolved.id, metadata: { refundDecision: "PARTIAL", amountPaise: 30000 }, createdAt: at(-20) },
      { actorId: null, action: "demo.seeded", entityType: "System", entityId: "seed", metadata: { listings: listings.length, users: users.length }, createdAt: new Date() },
    ],
  });
  log("demo data ready");
}
