import { randomToken } from "@/lib/crypto";

/**
 * Payment-provider boundary. Borrowly ships only a simulated provider: no real money moves.
 * A real gateway (e.g. Razorpay) would implement this interface and confirm results via a
 * signed webhook — the client is never trusted to report payment success.
 */
export interface PaymentProvider {
  readonly name: string;
  charge(input: ChargeInput): Promise<ChargeResult>;
  refund(input: { providerRef: string; amountPaise: number }): Promise<{ ok: boolean; providerRef: string }>;
}

export type ChargeInput = {
  amountPaise: number;
  idempotencyKey: string;
  description: string;
  /** Demo provider only: lets the tester choose the simulated outcome. */
  simulate?: "approve" | "decline";
};

export type ChargeResult = { ok: true; providerRef: string } | { ok: false; reason: string };

export class DemoPaymentProvider implements PaymentProvider {
  readonly name = "demo";
  async charge(input: ChargeInput): Promise<ChargeResult> {
    if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise <= 0) return { ok: false, reason: "Invalid amount" };
    if (input.simulate === "decline") return { ok: false, reason: "Simulated decline: the demo card was declined." };
    return { ok: true, providerRef: `demo_pay_${randomToken(10)}` };
  }
  async refund(input: { providerRef: string; amountPaise: number }) {
    return { ok: true, providerRef: `demo_rfnd_${randomToken(10)}` };
  }
}

let provider: PaymentProvider = new DemoPaymentProvider();
export const paymentProvider = () => provider;
/** Test hook. */
export const setPaymentProvider = (p: PaymentProvider) => (provider = p);
