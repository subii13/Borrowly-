"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AREAS } from "@/lib/constants";
import type { ActionResult } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/primitives";

type Values = { displayName: string; sellerType: "INDIVIDUAL" | "BUSINESS"; bio: string; area: string; pincode: string; pickupAddress: string; phone: string };

export function SellerProfileForm({ initial, action, submitLabel, redirectTo }: { initial: Values; action: (input: unknown) => Promise<ActionResult<unknown>>; submitLabel: string; redirectTo?: string }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await action(v);
          if (!r.ok) {
            setErrors(r.fieldErrors ?? {});
            return void toast.error(r.error);
          }
          toast.success(r.message ?? "Saved");
          if (redirectTo) router.push(redirectTo);
          router.refresh();
        });
      }}
    >
      <Field label="Display name" htmlFor="s-name" error={errors.displayName} hint="Shown on your listings"><input id="s-name" className="input" value={v.displayName} onChange={set("displayName")} /></Field>
      <Field label="Seller type" htmlFor="s-type" error={errors.sellerType}>
        <select id="s-type" className="input" value={v.sellerType} onChange={set("sellerType")}>
          <option value="INDIVIDUAL">Individual</option>
          <option value="BUSINESS">Small business</option>
        </select>
      </Field>
      <Field label="Area" htmlFor="s-area" error={errors.area}>
        <select id="s-area" className="input" value={v.area} onChange={(e) => setV({ ...v, area: e.target.value, pincode: AREAS.find((a) => a.name === e.target.value)?.pincode ?? v.pincode })}>
          <option value="">Choose area</option>
          {AREAS.map((a) => <option key={a.name}>{a.name}</option>)}
        </select>
      </Field>
      <Field label="Pincode" htmlFor="s-pin" error={errors.pincode}><input id="s-pin" className="input" inputMode="numeric" value={v.pincode} onChange={set("pincode")} /></Field>
      <Field label="Mobile number" htmlFor="s-phone" error={errors.phone} hint="Used for verification and shared with confirmed customers"><input id="s-phone" className="input" inputMode="tel" value={v.phone} onChange={set("phone")} /></Field>
      <Field label="Pickup address (private)" htmlFor="s-addr" error={errors.pickupAddress} hint="Only revealed after you confirm a booking"><input id="s-addr" className="input" value={v.pickupAddress} onChange={set("pickupAddress")} /></Field>
      <div className="sm:col-span-2"><Field label="About you or your business" htmlFor="s-bio" error={errors.bio}><textarea id="s-bio" className="input min-h-24" maxLength={600} value={v.bio} onChange={set("bio")} /></Field></div>
      <div><Button disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}{submitLabel}</Button></div>
    </form>
  );
}
