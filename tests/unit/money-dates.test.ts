import { describe, expect, it } from "vitest";
import { applyBps, formatINR, paiseToRupeeString, rupeesToPaise } from "@/lib/money";
import { addDays, daysBetween, parseDay, rangesOverlap } from "@/lib/dates";

describe("money (integer paise)", () => {
  it("applies basis points with half-up rounding and no floats", () => {
    expect(applyBps(65_000, 800)).toBe(5_200);
    expect(applyBps(12_345, 200)).toBe(247); // 246.9 → 247
    expect(applyBps(1, 5_000)).toBe(1); // 0.5 → 1
    expect(applyBps(0, 800)).toBe(0);
  });

  it("rejects invalid amounts and rates", () => {
    expect(() => applyBps(-1, 800)).toThrow();
    expect(() => applyBps(1.5, 800)).toThrow();
    expect(() => applyBps(100, 10_001)).toThrow();
  });

  it("parses rupee strings exactly", () => {
    expect(rupeesToPaise("1499")).toBe(149_900);
    expect(rupeesToPaise("0.1")).toBe(10);
    expect(rupeesToPaise("19.99")).toBe(1_999);
    expect(() => rupeesToPaise("1.234")).toThrow();
    expect(() => rupeesToPaise("-5")).toThrow();
    expect(() => rupeesToPaise("abc")).toThrow();
  });

  it("formats rupees for display", () => {
    expect(formatINR(150_000)).toBe("₹1,500");
    expect(formatINR(10_000_000)).toBe("₹1,00,000");
    expect(formatINR(1_999)).toBe("₹19.99");
    expect(paiseToRupeeString(1_999)).toBe("19.99");
    expect(paiseToRupeeString(50_000)).toBe("500");
  });
});

describe("rental dates — half-open [start, end)", () => {
  it("2 Nov → 5 Nov is three rental days", () => {
    expect(daysBetween(parseDay("2026-11-02"), parseDay("2026-11-05"))).toBe(3);
  });

  it("detects overlaps and allows back-to-back bookings", () => {
    const d = parseDay;
    expect(rangesOverlap(d("2026-11-02"), d("2026-11-05"), d("2026-11-04"), d("2026-11-06"))).toBe(true);
    expect(rangesOverlap(d("2026-11-02"), d("2026-11-05"), d("2026-11-05"), d("2026-11-07"))).toBe(false);
    expect(rangesOverlap(d("2026-11-05"), d("2026-11-07"), d("2026-11-02"), d("2026-11-05"))).toBe(false);
    expect(rangesOverlap(d("2026-11-01"), d("2026-11-10"), d("2026-11-03"), d("2026-11-04"))).toBe(true);
  });

  it("rejects malformed and impossible dates", () => {
    expect(() => parseDay("2026-02-30")).toThrow();
    expect(() => parseDay("05/11/2026")).toThrow();
    expect(addDays(parseDay("2026-12-31"), 1).toISOString().slice(0, 10)).toBe("2027-01-01");
  });
});
