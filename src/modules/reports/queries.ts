import type { Db } from "@/lib/db";
import { addDays, todayIST } from "@/lib/dates";

// Read models for dashboards. Every figure is computed from database records.

export type MonthPoint = { month: string; label: string; gross: number; commission: number; net: number };

function lastMonths(n: number, now = new Date()) {
  const out: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleString("en-IN", { month: "short", timeZone: "UTC" }) });
  }
  return out;
}

/** Completed transactions grouped by month of completion. */
export async function earningsByMonth(db: Db, sellerId: string | null, months = 6): Promise<MonthPoint[]> {
  const buckets = lastMonths(months);
  const since = new Date(`${buckets[0].key}-01T00:00:00Z`);
  const sellerFilter = sellerId ? { sellerId } : {};
  const [bookings, orders] = await Promise.all([
    db.rentalBooking.findMany({ where: { ...sellerFilter, status: "COMPLETED", completedAt: { gte: since } }, select: { completedAt: true, rentalSubtotalPaise: true, commissionPaise: true, sellerNetPaise: true, lateFeePaise: true } }),
    db.purchaseOrder.findMany({ where: { ...sellerFilter, status: "COMPLETED", completedAt: { gte: since } }, select: { completedAt: true, subtotalPaise: true, commissionPaise: true, sellerNetPaise: true } }),
  ]);
  const map = new Map(buckets.map((b) => [b.key, { month: b.key, label: b.label, gross: 0, commission: 0, net: 0 }]));
  for (const b of bookings) {
    const m = map.get(b.completedAt!.toISOString().slice(0, 7));
    if (m) { m.gross += b.rentalSubtotalPaise; m.commission += b.commissionPaise; m.net += b.sellerNetPaise + b.lateFeePaise; }
  }
  for (const o of orders) {
    const m = map.get(o.completedAt!.toISOString().slice(0, 7));
    if (m) { m.gross += o.subtotalPaise; m.commission += o.commissionPaise; m.net += o.sellerNetPaise; }
  }
  return [...map.values()];
}

export async function sellerOverview(db: Db, sellerId: string) {
  const today = todayIST();
  const [listingCounts, incoming, active, upcomingReturns, completedB, completedO, openOrders, totals, totalsO] = await Promise.all([
    db.listing.groupBy({ by: ["status"], where: { sellerId }, _count: true }),
    db.rentalBooking.count({ where: { sellerId, status: "REQUESTED" } }),
    db.rentalBooking.count({ where: { sellerId, status: { in: ["ACTIVE", "RETURN_PENDING"] } } }),
    db.rentalBooking.findMany({
      where: { sellerId, status: { in: ["ACTIVE", "RETURN_PENDING"] }, endDate: { lte: addDays(today, 7) } },
      include: { listing: { select: { title: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } }, customer: { select: { name: true } } },
      orderBy: { endDate: "asc" },
    }),
    db.rentalBooking.count({ where: { sellerId, status: "COMPLETED" } }),
    db.purchaseOrder.count({ where: { sellerId, status: "COMPLETED" } }),
    db.purchaseOrder.count({ where: { sellerId, status: { in: ["PLACED", "ACCEPTED", "HANDED_OVER"] } } }),
    db.rentalBooking.aggregate({ where: { sellerId, status: "COMPLETED" }, _sum: { rentalSubtotalPaise: true, commissionPaise: true, sellerNetPaise: true, lateFeePaise: true } }),
    db.purchaseOrder.aggregate({ where: { sellerId, status: "COMPLETED" }, _sum: { subtotalPaise: true, commissionPaise: true, sellerNetPaise: true } }),
  ]);
  const count = (s: string) => listingCounts.find((c) => c.status === s)?._count ?? 0;
  return {
    totalListings: listingCounts.reduce((s, c) => s + c._count, 0),
    activeListings: count("ACTIVE"),
    incoming,
    active,
    openOrders,
    upcomingReturns,
    completed: completedB + completedO,
    gross: (totals._sum.rentalSubtotalPaise ?? 0) + (totalsO._sum.subtotalPaise ?? 0),
    commission: (totals._sum.commissionPaise ?? 0) + (totalsO._sum.commissionPaise ?? 0),
    net: (totals._sum.sellerNetPaise ?? 0) + (totals._sum.lateFeePaise ?? 0) + (totalsO._sum.sellerNetPaise ?? 0),
  };
}

export async function platformOverview(db: Db) {
  const [users, sellers, pendingSellers, activeListings, bookings, orders, openDisputes, pendingRefunds, gmvB, gmvO, payments] = await Promise.all([
    db.user.count(),
    db.sellerProfile.count(),
    db.sellerProfile.count({ where: { verificationStatus: "PENDING" } }),
    db.listing.count({ where: { status: "ACTIVE" } }),
    db.rentalBooking.groupBy({ by: ["status"], _count: true }),
    db.purchaseOrder.groupBy({ by: ["status"], _count: true }),
    db.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    db.refund.aggregate({ where: { status: "PENDING" }, _sum: { amountPaise: true }, _count: true }),
    db.rentalBooking.aggregate({ where: { status: "COMPLETED" }, _sum: { rentalSubtotalPaise: true, commissionPaise: true } }),
    db.purchaseOrder.aggregate({ where: { status: "COMPLETED" }, _sum: { subtotalPaise: true, commissionPaise: true } }),
    db.payment.groupBy({ by: ["status"], _count: true, _sum: { amountPaise: true } }),
  ]);
  return {
    users,
    sellers,
    pendingSellers,
    activeListings,
    bookings,
    orders,
    openDisputes,
    pendingRefunds: { count: pendingRefunds._count, amount: pendingRefunds._sum.amountPaise ?? 0 },
    gmv: (gmvB._sum.rentalSubtotalPaise ?? 0) + (gmvO._sum.subtotalPaise ?? 0),
    commission: (gmvB._sum.commissionPaise ?? 0) + (gmvO._sum.commissionPaise ?? 0),
    payments,
  };
}

export async function categoryPerformance(db: Db) {
  const rows = await db.$queryRaw<{ name: string; listings: bigint; bookings: bigint; orders: bigint; gross: bigint | null }[]>`
    SELECT c.name,
      (SELECT count(*) FROM "Listing" l WHERE l."categoryId" = c.id AND l.status = 'ACTIVE') AS listings,
      (SELECT count(*) FROM "RentalBooking" b JOIN "Listing" l ON l.id = b."listingId" WHERE l."categoryId" = c.id AND b.status = 'COMPLETED') AS bookings,
      (SELECT count(*) FROM "PurchaseOrder" o JOIN "Listing" l ON l.id = o."listingId" WHERE l."categoryId" = c.id AND o.status = 'COMPLETED') AS orders,
      (SELECT COALESCE(SUM(b."rentalSubtotalPaise"),0) FROM "RentalBooking" b JOIN "Listing" l ON l.id = b."listingId" WHERE l."categoryId" = c.id AND b.status = 'COMPLETED')
      + (SELECT COALESCE(SUM(o."subtotalPaise"),0) FROM "PurchaseOrder" o JOIN "Listing" l ON l.id = o."listingId" WHERE l."categoryId" = c.id AND o.status = 'COMPLETED') AS gross
    FROM "Category" c ORDER BY c."sortOrder"`;
  return rows.map((r) => ({ name: r.name, listings: Number(r.listings), bookings: Number(r.bookings), orders: Number(r.orders), gross: Number(r.gross ?? 0) }));
}
