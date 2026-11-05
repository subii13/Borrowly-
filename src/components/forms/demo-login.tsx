"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, ShieldCheck, ShoppingBag, Store } from "lucide-react";
import { toast } from "sonner";
import { demoLoginAction } from "@/app/actions/auth";

const ROLES = [
  { role: "customer", label: "Customer", icon: ShoppingBag, body: "Arjun — active rental, bookings, purchases, a dispute" },
  { role: "seller", label: "Seller", icon: Store, body: "Raman Gear Hub — requests to confirm, returns, earnings" },
  { role: "admin", label: "Admin", icon: ShieldCheck, body: "Meera — verification queue, disputes, refunds, reports" },
] as const;

export function DemoLoginButtons({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (role: (typeof ROLES)[number]["role"]) =>
    start(async () => {
      const r = await demoLoginAction(role);
      if (!r.ok) return void toast.error(r.error);
      router.push(r.data);
      router.refresh();
    });
  return (
    <div className={compact ? "grid grid-cols-3 gap-2" : "grid gap-4 md:grid-cols-3"}>
      {ROLES.map(({ role, label, icon: Icon, body }) => (
        <button key={role} type="button" disabled={pending} onClick={() => go(role)} data-testid={`demo-${role}`} className={compact ? "flex flex-col items-center gap-1 rounded-lg border border-line-strong bg-white px-2 py-3 text-sm font-medium hover:border-forest hover:text-forest disabled:opacity-60" : "card flex flex-col items-start p-6 text-left transition-shadow hover:shadow-[var(--shadow-lift)] disabled:opacity-60"}>
          {pending ? <Loader2 className="size-5 animate-spin text-forest" /> : <Icon className="size-5 text-forest" />}
          <span className={compact ? "" : "mt-4 font-display text-lg font-bold"}>{compact ? label : `Continue as ${label}`}</span>
          {!compact && <span className="mt-1 text-sm text-ink-soft">{body}</span>}
        </button>
      ))}
    </div>
  );
}
