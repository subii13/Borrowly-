"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateSettingsAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/primitives";

export function SettingsForm({ initial }: { initial: { commissionBps: number; customerFeeBps: number; holdMinutes: number } }) {
  const router = useRouter();
  const [commission, setCommission] = useState(String(initial.commissionBps / 100));
  const [fee, setFee] = useState(String(initial.customerFeeBps / 100));
  const [hold, setHold] = useState(String(initial.holdMinutes));
  const [pending, start] = useTransition();
  const toBps = (pct: string) => Math.round(Number(pct) * 100);
  return (
    <form
      className="grid gap-4 sm:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateSettingsAction({ commissionBps: toBps(commission), customerFeeBps: toBps(fee), holdMinutes: Number(hold) });
          if (!r.ok) return void toast.error(r.fieldErrors ? Object.values(r.fieldErrors)[0] : r.error);
          toast.success("Settings saved");
          router.refresh();
        });
      }}
    >
      <Field label="Seller commission (%)" htmlFor="s-com" hint="5–10%"><input id="s-com" className="input" inputMode="decimal" value={commission} onChange={(e) => setCommission(e.target.value)} /></Field>
      <Field label="Customer service fee (%)" htmlFor="s-fee" hint="0–5%"><input id="s-fee" className="input" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} /></Field>
      <Field label="Checkout hold (minutes)" htmlFor="s-hold" hint="5–60"><input id="s-hold" className="input" inputMode="numeric" value={hold} onChange={(e) => setHold(e.target.value)} /></Field>
      <div><Button disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}Save settings</Button></div>
    </form>
  );
}
