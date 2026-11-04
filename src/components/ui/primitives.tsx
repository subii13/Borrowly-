import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import { Star } from "lucide-react";
import type { ReactNode } from "react";

export type Tone = "neutral" | "green" | "amber" | "rose" | "sky";

const tones: Record<Tone, string> = {
  neutral: "bg-ink/5 text-ink-soft",
  green: "bg-forest-50 text-forest",
  amber: "bg-amber-50 text-amber",
  rose: "bg-rose-50 text-rose",
  sky: "bg-sky-50 text-sky",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

const STATUS_TONE: Record<string, Tone> = {
  ACTIVE: "green", VERIFIED: "green", COMPLETED: "green", SUCCESS: "green", CONFIRMED: "green", PROCESSED: "green", RESOLVED: "green", PLACED: "sky",
  REQUESTED: "amber", PENDING: "amber", PENDING_PAYMENT: "amber", RETURN_PENDING: "amber", UNDER_REVIEW: "amber", REFUND_PENDING: "amber", OPEN: "amber", ACCEPTED: "sky", HANDED_OVER: "sky", CREATED: "neutral",
  CANCELLED: "neutral", INACTIVE: "neutral", DRAFT: "neutral", NOT_SUBMITTED: "neutral", REFUNDED: "neutral", SOLD_OUT: "neutral", RELEASED: "neutral",
  REJECTED: "rose", FAILED: "rose", PAYMENT_FAILED: "rose", SUSPENDED: "rose",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{label ?? status.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</Badge>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("card", className)}>{children}</div>;
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-2xl font-bold sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-forest-50 text-forest">
        <Icon className="size-5" aria-hidden />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-soft">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, icon: Icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ink-soft">{label}</p>
        {Icon && <Icon className="size-4 text-sage" aria-hidden />}
      </div>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

export function Rating({ sum, count, size = "sm" }: { sum: number; count: number; size?: "sm" | "md" }) {
  if (!count) return <span className="text-xs text-ink-faint">New</span>;
  const avg = (sum / count).toFixed(1);
  return (
    <span className={clsx("inline-flex items-center gap-1 text-ink", size === "sm" ? "text-xs" : "text-sm")}>
      <Star className={clsx("fill-amber text-amber", size === "sm" ? "size-3.5" : "size-4")} aria-hidden />
      <span className="font-semibold">{avg}</span>
      <span className="text-ink-faint">({count})</span>
    </span>
  );
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={clsx("size-4", i <= value ? "fill-amber text-amber" : "text-line-strong")} aria-hidden />
      ))}
    </span>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return <span className={clsx("grid shrink-0 place-items-center rounded-full bg-forest-100 font-semibold text-forest", className ?? "size-9 text-sm")}>{initials}</span>;
}

export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? <p className="mt-1 text-sm text-rose" role="alert">{error}</p> : hint ? <p className="mt-1 text-xs text-ink-faint">{hint}</p> : null}
    </div>
  );
}

export function DefinitionList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-line text-sm">
      {items.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 py-2.5">
          <dt className="text-ink-soft">{k}</dt>
          <dd className="text-right font-medium text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="card overflow-x-auto">{children}</div>;
}
