// All money is integer paise. Never use floating point for amounts.

export const PAISE_PER_RUPEE = 100;

export function assertPaise(value: number, label = "amount"): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a non-negative integer number of paise`);
  return value;
}

/** Rounds half-up: amount × bps / 10 000 using integer arithmetic only. */
export function applyBps(amountPaise: number, bps: number): number {
  assertPaise(amountPaise);
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) throw new Error("bps must be an integer between 0 and 10000");
  return Math.floor((amountPaise * bps + 5_000) / 10_000);
}

/** Converts a rupee amount typed by a user ("1499" or "1499.50") into paise without floats. */
export function rupeesToPaise(input: string | number): number {
  const s = String(input).trim();
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) throw new Error("Invalid rupee amount");
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 });

export function formatINR(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return "—";
  const rupees = Math.trunc(paise / 100);
  const rem = Math.abs(paise % 100);
  // Format whole rupees with Intl, then append paise only when present.
  const whole = inr.format(rupees);
  return rem ? `${whole}.${String(rem).padStart(2, "0")}` : whole;
}

export function paiseToRupeeString(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return "";
  const rem = paise % 100;
  return rem ? `${Math.trunc(paise / 100)}.${String(rem).padStart(2, "0")}` : String(paise / 100);
}
