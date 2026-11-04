import { applyBps, assertPaise } from "@/lib/money";

// Pure, server-side price calculations. Every input is integer paise or basis points.

export type FeeRates = { customerFeeBps: number; commissionBps: number };

export type RentalQuote = {
  days: number;
  quantity: number;
  dailyRatePaise: number;
  rentalSubtotalPaise: number;
  depositPaise: number;
  serviceFeePaise: number;
  totalPaise: number;
  commissionPaise: number;
  sellerNetPaise: number;
} & FeeRates;

export function rentalQuote(input: { dailyRatePaise: number; depositPaise: number; days: number; quantity: number } & FeeRates): RentalQuote {
  const { dailyRatePaise, depositPaise, days, quantity } = input;
  assertPaise(dailyRatePaise, "daily rate");
  assertPaise(depositPaise, "deposit");
  if (!Number.isInteger(days) || days < 1) throw new Error("Rental must be at least one day");
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Quantity must be at least one");
  const rentalSubtotalPaise = dailyRatePaise * days * quantity;
  const deposit = depositPaise * quantity;
  const serviceFeePaise = applyBps(rentalSubtotalPaise, input.customerFeeBps);
  const commissionPaise = applyBps(rentalSubtotalPaise, input.commissionBps);
  return {
    days,
    quantity,
    dailyRatePaise,
    rentalSubtotalPaise,
    depositPaise: deposit,
    serviceFeePaise,
    totalPaise: rentalSubtotalPaise + deposit + serviceFeePaise,
    commissionPaise,
    sellerNetPaise: rentalSubtotalPaise - commissionPaise,
    customerFeeBps: input.customerFeeBps,
    commissionBps: input.commissionBps,
  };
}

export type PurchaseQuote = {
  quantity: number;
  unitPricePaise: number;
  subtotalPaise: number;
  serviceFeePaise: number;
  totalPaise: number;
  commissionPaise: number;
  sellerNetPaise: number;
} & FeeRates;

export function purchaseQuote(input: { unitPricePaise: number; quantity: number } & FeeRates): PurchaseQuote {
  assertPaise(input.unitPricePaise, "price");
  if (!Number.isInteger(input.quantity) || input.quantity < 1) throw new Error("Quantity must be at least one");
  const subtotalPaise = input.unitPricePaise * input.quantity;
  const serviceFeePaise = applyBps(subtotalPaise, input.customerFeeBps);
  const commissionPaise = applyBps(subtotalPaise, input.commissionBps);
  return {
    quantity: input.quantity,
    unitPricePaise: input.unitPricePaise,
    subtotalPaise,
    serviceFeePaise,
    totalPaise: subtotalPaise + serviceFeePaise,
    commissionPaise,
    sellerNetPaise: subtotalPaise - commissionPaise,
    customerFeeBps: input.customerFeeBps,
    commissionBps: input.commissionBps,
  };
}

/** Late fee = daily rate × late days × quantity, capped at the deposit held. */
export function lateFee(input: { dailyRatePaise: number; lateDays: number; quantity: number; depositPaise: number }): number {
  if (input.lateDays <= 0) return 0;
  return Math.min(input.dailyRatePaise * input.lateDays * input.quantity, input.depositPaise);
}
