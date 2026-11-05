"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/errors";
import { rupeesToPaise } from "@/lib/money";
import { Button } from "@/components/ui/button";

export function ResolveDisputeForm({ action, refundableLabel }: { action: (input: unknown) => Promise<ActionResult<unknown>>; refundableLabel: string }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<"RESOLVED" | "REJECTED">("RESOLVED");
  const [decision, setDecision] = useState<"NONE" | "PARTIAL" | "FULL">("NONE");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="card p-5">
      <h3 className="font-semibold">Record decision</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="r-out">Outcome</label>
          <select id="r-out" className="input" value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)}>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Closed — no action</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="r-dec">Refund</label>
          <select id="r-dec" className="input" value={decision} onChange={(e) => setDecision(e.target.value as typeof decision)}>
            <option value="NONE">No refund</option>
            <option value="PARTIAL">Partial refund</option>
            <option value="FULL">Full refund of remaining balance</option>
          </select>
        </div>
        {decision === "PARTIAL" && (
          <div>
            <label className="label" htmlFor="r-amt">Refund amount (₹)</label>
            <input id="r-amt" className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <p className="mt-1 text-xs text-ink-faint">{refundableLabel}</p>
          </div>
        )}
        <div className="sm:col-span-2">
          <label className="label" htmlFor="r-note">Resolution note (shared with the parties)</label>
          <textarea id="r-note" className="input min-h-24" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      <Button
        className="mt-4"
        disabled={pending}
        onClick={() =>
          start(async () => {
            let refundAmountPaise = 0;
            if (decision === "PARTIAL") {
              try {
                refundAmountPaise = rupeesToPaise(amount);
              } catch {
                return void toast.error("Enter a valid rupee amount");
              }
            }
            const r = await action({ outcome, refundDecision: decision, refundAmountPaise, resolutionNote: note });
            if (!r.ok) return void toast.error(r.fieldErrors ? Object.values(r.fieldErrors)[0] : r.error);
            toast.success("Decision recorded");
            router.refresh();
          })
        }
      >
        {pending && <Loader2 className="size-4 animate-spin" />}Save decision
      </Button>
    </div>
  );
}
