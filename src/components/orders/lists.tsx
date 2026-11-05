import Link from "next/link";
import type { BookingStatus, PurchaseStatus } from "@prisma/client";
import { formatDay, formatRange } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { BOOKING_STATUS_LABEL, PURCHASE_STATUS_LABEL } from "@/lib/constants";
import { SafeImage } from "@/components/ui/safe-image";
import { StatusBadge } from "@/components/ui/primitives";

type BookingRow = {
  id: string;
  code: string;
  status: BookingStatus;
  startDate: Date;
  endDate: Date;
  totalPaise: number;
  sellerNetPaise: number;
  listing: { title: string; images: { url: string }[] };
  counterparty: string;
};

export function BookingList({ rows, basePath, showNet }: { rows: BookingRow[]; basePath: string; showNet?: boolean }) {
  return (
    <ul className="space-y-3">
      {rows.map((b) => (
        <li key={b.id}>
          <Link href={`${basePath}/${b.id}`} className="card flex items-center gap-4 p-3 transition-shadow hover:shadow-[var(--shadow-lift)] sm:p-4">
            <div className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-lg sm:w-24">
              <SafeImage src={b.listing.images[0]?.url ?? ""} alt="" fill sizes="96px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{b.listing.title}</p>
              <p className="mt-0.5 text-sm text-ink-soft">{formatRange(b.startDate, b.endDate)}</p>
              <p className="mt-0.5 text-xs text-ink-faint">{b.code} · {b.counterparty}</p>
            </div>
            <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
              <StatusBadge status={b.status} label={BOOKING_STATUS_LABEL[b.status]} />
              <span className="text-sm font-semibold tabular-nums">{formatINR(showNet ? b.sellerNetPaise : b.totalPaise)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

type OrderRow = { id: string; code: string; status: PurchaseStatus; createdAt: Date; totalPaise: number; sellerNetPaise: number; listing: { title: string; images: { url: string }[] }; counterparty: string };

export function OrderList({ rows, basePath, showNet }: { rows: OrderRow[]; basePath: string; showNet?: boolean }) {
  return (
    <ul className="space-y-3">
      {rows.map((o) => (
        <li key={o.id}>
          <Link href={`${basePath}/${o.id}`} className="card flex items-center gap-4 p-3 transition-shadow hover:shadow-[var(--shadow-lift)] sm:p-4">
            <div className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-lg sm:w-24">
              <SafeImage src={o.listing.images[0]?.url ?? ""} alt="" fill sizes="96px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{o.listing.title}</p>
              <p className="mt-0.5 text-sm text-ink-soft">Ordered {formatDay(o.createdAt)}</p>
              <p className="mt-0.5 text-xs text-ink-faint">{o.code} · {o.counterparty}</p>
            </div>
            <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
              <StatusBadge status={o.status} label={PURCHASE_STATUS_LABEL[o.status]} />
              <span className="text-sm font-semibold tabular-nums">{formatINR(showNet ? o.sellerNetPaise : o.totalPaise)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function TabLinks({ tabs, active }: { tabs: { key: string; label: string; href: string; count?: number }[]; active: string }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line scrollbar-none">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} aria-current={t.key === active ? "page" : undefined} className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap ${t.key === active ? "border-forest font-semibold text-forest" : "border-transparent text-ink-soft hover:text-ink"}`}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 text-xs text-ink-faint">{t.count}</span>}
        </Link>
      ))}
    </div>
  );
}
