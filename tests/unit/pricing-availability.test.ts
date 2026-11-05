import { describe, expect, it } from "vitest";
import { lateFee, purchaseQuote, rentalQuote } from "@/modules/pricing/pricing";
import { overlappingQuantity, peakReserved } from "@/modules/rentals/availability";
import { parseDay } from "@/lib/dates";

const rates = { customerFeeBps: 200, commissionBps: 800 };

describe("rental pricing", () => {
  it("computes subtotal, fee, deposit, commission and seller net", () => {
    const q = rentalQuote({ dailyRatePaise: 20_000, depositPaise: 150_000, days: 3, quantity: 1, ...rates });
    expect(q).toMatchObject({ rentalSubtotalPaise: 60_000, serviceFeePaise: 1_200, depositPaise: 150_000, totalPaise: 211_200, commissionPaise: 4_800, sellerNetPaise: 55_200 });
  });

  it("scales by quantity, including the deposit", () => {
    const q = rentalQuote({ dailyRatePaise: 10_000, depositPaise: 50_000, days: 2, quantity: 3, ...rates });
    expect(q.rentalSubtotalPaise).toBe(60_000);
    expect(q.depositPaise).toBe(150_000);
  });

  it("refuses zero-day rentals and bad input", () => {
    expect(() => rentalQuote({ dailyRatePaise: 100, depositPaise: 0, days: 0, quantity: 1, ...rates })).toThrow();
    expect(() => rentalQuote({ dailyRatePaise: 10.5, depositPaise: 0, days: 1, quantity: 1, ...rates })).toThrow();
  });

  it("computes purchase totals", () => {
    const q = purchaseQuote({ unitPricePaise: 1_100_000, quantity: 1, ...rates });
    expect(q).toMatchObject({ subtotalPaise: 1_100_000, serviceFeePaise: 22_000, totalPaise: 1_122_000, commissionPaise: 88_000, sellerNetPaise: 1_012_000 });
  });

  it("caps late fees at the deposit", () => {
    expect(lateFee({ dailyRatePaise: 10_000, lateDays: 0, quantity: 1, depositPaise: 50_000 })).toBe(0);
    expect(lateFee({ dailyRatePaise: 10_000, lateDays: 2, quantity: 1, depositPaise: 50_000 })).toBe(20_000);
    expect(lateFee({ dailyRatePaise: 10_000, lateDays: 9, quantity: 1, depositPaise: 50_000 })).toBe(50_000);
  });
});

describe("availability maths", () => {
  const r = (s: string, e: string, quantity = 1) => ({ startDate: parseDay(s), endDate: parseDay(e), quantity });

  it("sums only overlapping reservations", () => {
    const res = [r("2026-11-01", "2026-11-03"), r("2026-11-03", "2026-11-05", 2), r("2026-11-10", "2026-11-12")];
    expect(overlappingQuantity(res, parseDay("2026-11-02"), parseDay("2026-11-04"))).toBe(3);
    expect(overlappingQuantity(res, parseDay("2026-11-05"), parseDay("2026-11-10"))).toBe(0);
  });

  it("finds the peak concurrent reservation (back-to-back bookings do not stack)", () => {
    expect(peakReserved([r("2026-11-01", "2026-11-03"), r("2026-11-03", "2026-11-05")])).toBe(1);
    expect(peakReserved([r("2026-11-01", "2026-11-05"), r("2026-11-02", "2026-11-03", 2)])).toBe(3);
    expect(peakReserved([])).toBe(0);
  });
});
