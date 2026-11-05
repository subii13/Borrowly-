import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Check, CircleDot, FileText, ImageIcon, MapPin } from "lucide-react";
import { clsx } from "clsx";
import { db } from "@/lib/db";
import { formatDateTime, formatDay, formatRange, todayIST } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { BOOKING_STATUS_LABEL, DISPUTE_STATUS_LABEL, PAYMENT_STATUS_LABEL, PURCHASE_STATUS_LABEL } from "@/lib/constants";
import { partyOf, type Actor } from "@/lib/permissions";
import { SafeImage } from "@/components/ui/safe-image";
import { ActionButton } from "@/components/ui/action-button";
import { DefinitionList, StatusBadge } from "@/components/ui/primitives";
import { ConfirmStepForm, ReviewForm } from "./order-forms";
import {
  acceptOrderAction,
  cancelBookingAction,
  cancelOrderAction,
  confirmPurchaseHandoverAction,
  confirmRentalStepAction,
  correctEvidenceAction,
  respondBookingAction,
  reviewAction,
} from "@/app/actions/orders";

const evidenceInclude = { evidence: { include: { uploadedBy: { select: { name: true } } }, orderBy: { createdAt: "asc" as const } } };

function Timeline({ steps }: { steps: { label: string; at?: Date | null; state: "done" | "current" | "todo" | "stopped" }[] }) {
  return (
    <ol className="space-y-0">
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex gap-3 pb-5 last:pb-0">
          {i < steps.length - 1 && <span className={clsx("absolute left-[11px] top-6 h-[calc(100%-18px)] w-px", s.state === "done" ? "bg-forest" : "bg-line")} />}
          <span className={clsx("relative grid size-6 shrink-0 place-items-center rounded-full", s.state === "done" && "bg-forest text-white", s.state === "current" && "border-2 border-forest bg-white text-forest", s.state === "todo" && "border border-line-strong bg-white", s.state === "stopped" && "bg-rose text-white")}>
            {s.state === "done" ? <Check className="size-3.5" /> : s.state === "current" ? <CircleDot className="size-3" /> : s.state === "stopped" ? <AlertTriangle className="size-3" /> : null}
          </span>
          <div className="-mt-0.5">
            <p className={clsx("text-sm", s.state === "todo" ? "text-ink-faint" : "font-medium")}>{s.label}</p>
            {s.at && <p className="text-xs text-ink-faint">{formatDateTime(s.at)}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

type Evidence = { id: string; kind: string; note: string | null; storageKey: string | null; createdAt: Date; uploadedById: string; correctsId: string | null; uploadedBy: { name: string } };

function EvidenceList({ title, handover, actor }: { title: string; handover: { sellerConfirmedAt: Date | null; customerConfirmedAt: Date | null; evidence: Evidence[] } | undefined; actor: Actor }) {
  if (!handover) return null;
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-xs text-ink-soft">
          Seller {handover.sellerConfirmedAt ? `✓ ${formatDateTime(handover.sellerConfirmedAt)}` : "pending"} · Customer {handover.customerConfirmedAt ? `✓ ${formatDateTime(handover.customerConfirmedAt)}` : "pending"}
        </p>
      </div>
      <ul className="mt-4 space-y-3">
        {handover.evidence.map((e) => (
          <li key={e.id} className="flex gap-3 text-sm">
            {e.kind === "PHOTO" ? <ImageIcon className="mt-0.5 size-4 shrink-0 text-sage" /> : <FileText className="mt-0.5 size-4 shrink-0 text-sage" />}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-ink-faint">{e.uploadedBy.name} · {formatDateTime(e.createdAt)}{e.correctsId && " · correction"}</p>
              {e.kind === "PHOTO" ? (
                <a href={`/api/evidence/${e.id}`} target="_blank" rel="noreferrer" className="mt-1 block w-32 overflow-hidden rounded-lg border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/evidence/${e.id}`} alt="Evidence photo" className="aspect-[4/3] w-full object-cover" loading="lazy" />
                </a>
              ) : (
                <p className="mt-0.5 text-ink">{e.note}</p>
              )}
              {e.uploadedById === actor.id && e.kind === "NOTE" && !e.correctsId && (
                <div className="mt-1">
                  <ActionButton variant="ghost" size="sm" className="!h-7 !px-2 text-xs" action={correctEvidenceAction.bind(null, e.id)} prompt={{ label: "Add a correction (the original stays on record)", required: true }} success="Correction recorded">
                    Add correction
                  </ActionButton>
                </div>
              )}
            </div>
          </li>
        ))}
        {!handover.evidence.length && <li className="text-sm text-ink-soft">No evidence recorded yet.</li>}
      </ul>
    </div>
  );
}

function PaymentsCard({ payments }: { payments: { id: string; amountPaise: number; status: keyof typeof PAYMENT_STATUS_LABEL; provider: string; providerRef: string | null; failureReason: string | null; createdAt: Date; refunds: { id: string; amountPaise: number; type: string; status: string; reason: string; createdAt: Date }[] }[] }) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold">Payment record</h3>
      <p className="mt-0.5 text-xs text-ink-faint">Demo payments only — no real money moved.</p>
      <ul className="mt-3 space-y-3 text-sm">
        {payments.map((p) => (
          <li key={p.id} className="rounded-lg bg-canvas p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{formatINR(p.amountPaise)}</span>
              <StatusBadge status={p.status} label={PAYMENT_STATUS_LABEL[p.status]} />
            </div>
            <p className="mt-1 text-xs text-ink-faint">{p.provider} · {p.providerRef ?? "no reference"} · {formatDateTime(p.createdAt)}</p>
            {p.failureReason && <p className="mt-1 text-xs text-rose">{p.failureReason}</p>}
            {p.refunds.map((r) => (
              <p key={r.id} className="mt-1.5 text-xs text-ink-soft">↳ Refund {formatINR(r.amountPaise)} · {r.type.replace("_", " ").toLowerCase()} · {r.status.toLowerCase()} — {r.reason}</p>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DisputesCard({ disputes, raiseHref, viewBase }: { disputes: { id: string; code: string; status: keyof typeof DISPUTE_STATUS_LABEL; category: string }[]; raiseHref?: string; viewBase: string }) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold">Disputes</h3>
      {disputes.length ? (
        <ul className="mt-3 space-y-2 text-sm">
          {disputes.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2">
              <Link href={`${viewBase}/${d.id}`} className="font-medium text-forest hover:underline">{d.code}</Link>
              <StatusBadge status={d.status} label={DISPUTE_STATUS_LABEL[d.status]} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-ink-soft">No disputes on this transaction.</p>
      )}
      {raiseHref && <Link href={raiseHref} className="mt-3 inline-block text-sm font-medium text-rose hover:underline">Report a problem</Link>}
    </div>
  );
}

// ─── Rental booking ─────────────────────────────────────────────────────────

export async function BookingDetail({ bookingId, actor }: { bookingId: string; actor: Actor }) {
  const b = await db.rentalBooking.findUnique({
    where: { id: bookingId },
    include: {
      listing: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
      seller: { select: { id: true, displayName: true, userId: true, pickupAddress: true, phone: true, area: true } },
      customer: { select: { name: true, email: true, profile: { select: { phone: true } } } },
      payments: { include: { refunds: true }, orderBy: { createdAt: "asc" } },
      handovers: { include: evidenceInclude },
      review: true,
      disputes: { select: { id: true, code: true, status: true, category: true, raisedById: true } },
    },
  });
  const party = b && partyOf(actor, b);
  if (!b || !party) notFound();

  const handover = b.handovers.find((h) => h.type === "HANDOVER");
  const ret = b.handovers.find((h) => h.type === "RETURN");
  const stopped = ["CANCELLED", "REJECTED", "PAYMENT_FAILED"].includes(b.status);
  const order = ["REQUESTED", "CONFIRMED", "ACTIVE", "RETURN_PENDING", "COMPLETED"];
  const idx = order.indexOf(b.status);
  const st = (i: number): "done" | "current" | "todo" => (idx > i || b.status === "COMPLETED" ? "done" : idx === i ? "current" : "todo");
  const revealContact = ["CONFIRMED", "ACTIVE", "RETURN_PENDING", "COMPLETED"].includes(b.status);
  const overdue = ["ACTIVE", "RETURN_PENDING"].includes(b.status) && b.endDate < todayIST();
  const myConfirmed = (h?: { sellerConfirmedAt: Date | null; customerConfirmedAt: Date | null }) => (party === "seller" ? !!h?.sellerConfirmedAt : !!h?.customerConfirmedAt);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-ink-soft">Rental booking · {b.code}</p>
          <h1 className="mt-1 text-2xl font-bold">{b.listing.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={b.status} label={BOOKING_STATUS_LABEL[b.status]} />
            {overdue && <StatusBadge status="FAILED" label="Return overdue" />}
            {b.isDemo && <span className="text-xs text-ink-faint">Demonstration record</span>}
          </div>
        </div>
        <Link href={`/listings/${b.listingId}`} className="relative aspect-[4/3] w-full max-w-[160px] shrink-0 overflow-hidden rounded-xl border border-line">
          <SafeImage src={b.listing.images[0]?.url ?? ""} alt="" fill sizes="160px" className="object-cover" />
        </Link>
      </div>

      {/* Actions for the viewer */}
      <div className="space-y-3">
        {party === "seller" && b.status === "REQUESTED" && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber/30 bg-amber-50 p-4">
            <p className="mr-auto text-sm text-amber">{b.customer.name} has paid and is waiting for your confirmation.</p>
            <ActionButton action={respondBookingAction.bind(null, b.id, "confirm")} success="Booking confirmed">Confirm booking</ActionButton>
            <ActionButton variant="secondary" action={respondBookingAction.bind(null, b.id, "decline")} prompt={{ label: "Reason for declining (shared with the customer)", required: true }}>Decline</ActionButton>
          </div>
        )}
        {party !== "admin" && b.status === "CONFIRMED" && !myConfirmed(handover) && (
          <ConfirmStepForm action={confirmRentalStepAction.bind(null, b.id, "HANDOVER")} label={party === "seller" ? "Confirm item handed over" : "Confirm item received"} help="Both of you confirm at pickup. The rental becomes active once both have confirmed." />
        )}
        {party !== "admin" && ["ACTIVE", "RETURN_PENDING"].includes(b.status) && !myConfirmed(ret) && (
          <ConfirmStepForm action={confirmRentalStepAction.bind(null, b.id, "RETURN")} label={party === "seller" ? "Confirm item returned" : "Confirm item returned"} help="Both of you confirm the return. The deposit is released when both have confirmed." />
        )}
        {party !== "admin" && ["REQUESTED", "CONFIRMED"].includes(b.status) && (
          <ActionButton variant="ghost" action={cancelBookingAction.bind(null, b.id)} prompt={{ label: "Why are you cancelling?", required: true }}>Cancel booking</ActionButton>
        )}
        {party === "customer" && b.status === "COMPLETED" && !b.review && <ReviewForm action={reviewAction.bind(null, { bookingId: b.id })} />}
        {b.status === "PAYMENT_FAILED" && party === "customer" && (
          <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose">The demo payment was declined, so no booking was made and the dates were released. <Link href={`/listings/${b.listingId}`} className="font-semibold underline">Try again</Link></p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="font-semibold">Summary</h3>
            <div className="mt-2">
              <DefinitionList
                items={[
                  ["Dates", formatRange(b.startDate, b.endDate)],
                  ["Days", `${b.days} × ${formatINR(b.dailyRatePaise)}`],
                  ["Rental", formatINR(b.rentalSubtotalPaise)],
                  ["Service fee", formatINR(b.serviceFeePaise)],
                  ["Deposit (refundable)", formatINR(b.depositPaise)],
                  ["Total paid", formatINR(b.totalPaise)],
                  ...(party !== "customer" ? ([[`Commission (${b.commissionBps / 100}%)`, `− ${formatINR(b.commissionPaise)}`], ["Seller earnings", formatINR(b.sellerNetPaise + b.lateFeePaise)]] as [string, string][]) : []),
                  ...(b.lateDays > 0 ? ([["Late return", `${b.lateDays} day(s) · ${formatINR(b.lateFeePaise)} kept from deposit`]] as [string, string][]) : []),
                ]}
              />
            </div>
          </div>
          <EvidenceList title="Pickup handover" handover={handover} actor={actor} />
          <EvidenceList title="Return" handover={ret} actor={actor} />
          {b.review && (
            <div className="card p-5">
              <h3 className="font-semibold">Review</h3>
              <p className="mt-1 text-sm">{"★".repeat(b.review.rating)}{"☆".repeat(5 - b.review.rating)}</p>
              <p className="mt-1 text-sm text-ink-soft">{b.review.comment}</p>
            </div>
          )}
        </div>
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="mb-4 font-semibold">Progress</h3>
            {stopped ? (
              <Timeline steps={[{ label: "Booking created", at: b.createdAt, state: "done" }, { label: BOOKING_STATUS_LABEL[b.status], at: b.cancelledAt ?? b.updatedAt, state: "stopped" }]} />
            ) : (
              <Timeline
                steps={[
                  { label: "Paid · awaiting seller", at: b.createdAt, state: b.status === "PENDING_PAYMENT" ? "current" : "done" },
                  { label: "Seller confirmed", at: b.sellerConfirmedAt, state: st(0) },
                  { label: "Handed over · rental active", at: b.handedOverAt, state: st(1) },
                  { label: "Returned", at: b.returnedAt, state: st(2) },
                  { label: "Completed · deposit released", at: b.completedAt, state: b.status === "COMPLETED" ? "done" : "todo" },
                ]}
              />
            )}
          </div>
          <div className="card p-5 text-sm">
            <h3 className="font-semibold">{party === "customer" ? "Pickup from" : "Customer"}</h3>
            {party === "customer" ? (
              <>
                <p className="mt-2 font-medium">{b.seller.displayName}</p>
                <p className="mt-1 flex items-start gap-1.5 text-ink-soft"><MapPin className="mt-0.5 size-4 shrink-0" />{revealContact ? b.seller.pickupAddress ?? b.seller.area : `${b.seller.area} — exact address shown after confirmation`}</p>
                {revealContact && b.seller.phone && <p className="mt-1 text-ink-soft">Phone: {b.seller.phone}</p>}
              </>
            ) : (
              <>
                <p className="mt-2 font-medium">{b.customer.name}</p>
                {revealContact && <p className="mt-1 text-ink-soft">{b.customer.email}{b.customer.profile?.phone ? ` · ${b.customer.profile.phone}` : ""}</p>}
              </>
            )}
          </div>
          <PaymentsCard payments={b.payments} />
          <DisputesCard
            disputes={b.disputes}
            viewBase={party === "admin" ? "/admin/disputes" : "/account/disputes"}
            raiseHref={party !== "admin" && !["PENDING_PAYMENT", "PAYMENT_FAILED"].includes(b.status) ? `/account/disputes/new?booking=${b.id}` : undefined}
          />
          <p className="text-xs text-ink-faint">Booked {formatDay(b.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Purchase order ─────────────────────────────────────────────────────────

export async function PurchaseDetail({ orderId, actor }: { orderId: string; actor: Actor }) {
  const o = await db.purchaseOrder.findUnique({
    where: { id: orderId },
    include: {
      listing: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
      seller: { select: { displayName: true, pickupAddress: true, phone: true, area: true } },
      customer: { select: { name: true, email: true, profile: { select: { phone: true } } } },
      payments: { include: { refunds: true }, orderBy: { createdAt: "asc" } },
      handovers: { include: evidenceInclude },
      review: true,
      disputes: { select: { id: true, code: true, status: true, category: true } },
    },
  });
  const party = o && partyOf(actor, o);
  if (!o || !party) notFound();
  const handover = o.handovers.find((h) => h.type === "HANDOVER");
  const stopped = ["CANCELLED", "PAYMENT_FAILED"].includes(o.status);
  const steps = ["PLACED", "ACCEPTED", "HANDED_OVER", "COMPLETED"];
  const idx = steps.indexOf(o.status);
  const st = (i: number): "done" | "current" | "todo" => (idx >= i ? "done" : idx + 1 === i ? "current" : "todo");
  const reveal = ["ACCEPTED", "HANDED_OVER", "COMPLETED"].includes(o.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-ink-soft">Purchase order · {o.code}</p>
          <h1 className="mt-1 text-2xl font-bold">{o.listing.title}</h1>
          <div className="mt-2 flex items-center gap-2"><StatusBadge status={o.status} label={PURCHASE_STATUS_LABEL[o.status]} />{o.isDemo && <span className="text-xs text-ink-faint">Demonstration record</span>}</div>
        </div>
        <Link href={`/listings/${o.listingId}`} className="relative aspect-[4/3] w-full max-w-[160px] shrink-0 overflow-hidden rounded-xl border border-line">
          <SafeImage src={o.listing.images[0]?.url ?? ""} alt="" fill sizes="160px" className="object-cover" />
        </Link>
      </div>

      <div className="space-y-3">
        {party === "seller" && o.status === "PLACED" && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber/30 bg-amber-50 p-4">
            <p className="mr-auto text-sm text-amber">{o.customer.name} has paid. Accept to share your pickup details.</p>
            <ActionButton action={acceptOrderAction.bind(null, o.id)}>Accept order</ActionButton>
          </div>
        )}
        {party === "seller" && o.status === "ACCEPTED" && <ConfirmStepForm action={confirmPurchaseHandoverAction.bind(null, o.id)} label="Confirm item handed over" help="Record the condition at handover. The buyer then confirms receipt." />}
        {party === "customer" && o.status === "HANDED_OVER" && <ConfirmStepForm action={confirmPurchaseHandoverAction.bind(null, o.id)} label="Confirm I received the item" help="Only confirm once you have the item and it matches the listing." />}
        {party !== "admin" && (party === "customer" ? o.status === "PLACED" : ["PLACED", "ACCEPTED"].includes(o.status)) && (
          <ActionButton variant="ghost" action={cancelOrderAction.bind(null, o.id)} prompt={{ label: "Why are you cancelling?", required: true }}>Cancel order</ActionButton>
        )}
        {party === "customer" && o.status === "COMPLETED" && !o.review && <ReviewForm action={reviewAction.bind(null, { purchaseOrderId: o.id })} />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="font-semibold">Summary</h3>
            <div className="mt-2">
              <DefinitionList
                items={[
                  ["Item price", formatINR(o.subtotalPaise)],
                  ["Service fee", formatINR(o.serviceFeePaise)],
                  ["Total paid", formatINR(o.totalPaise)],
                  ...(party !== "customer" ? ([[`Commission (${o.commissionBps / 100}%)`, `− ${formatINR(o.commissionPaise)}`], ["Seller earnings", formatINR(o.sellerNetPaise)]] as [string, string][]) : []),
                ]}
              />
            </div>
          </div>
          <EvidenceList title="Handover" handover={handover} actor={actor} />
          {o.review && (
            <div className="card p-5">
              <h3 className="font-semibold">Review</h3>
              <p className="mt-1 text-sm">{"★".repeat(o.review.rating)}{"☆".repeat(5 - o.review.rating)}</p>
              <p className="mt-1 text-sm text-ink-soft">{o.review.comment}</p>
            </div>
          )}
        </div>
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="mb-4 font-semibold">Progress</h3>
            {stopped ? (
              <Timeline steps={[{ label: "Order created", at: o.createdAt, state: "done" }, { label: PURCHASE_STATUS_LABEL[o.status], at: o.cancelledAt ?? o.updatedAt, state: "stopped" }]} />
            ) : (
              <Timeline
                steps={[
                  { label: "Paid · order placed", at: o.createdAt, state: st(0) },
                  { label: "Seller accepted", at: o.acceptedAt, state: st(1) },
                  { label: "Handed over", at: o.handedOverAt, state: st(2) },
                  { label: "Received · completed", at: o.completedAt, state: st(3) },
                ]}
              />
            )}
          </div>
          <div className="card p-5 text-sm">
            <h3 className="font-semibold">{party === "customer" ? "Pickup from" : "Buyer"}</h3>
            {party === "customer" ? (
              <>
                <p className="mt-2 font-medium">{o.seller.displayName}</p>
                <p className="mt-1 text-ink-soft">{reveal ? o.seller.pickupAddress ?? o.seller.area : `${o.seller.area} — exact address shown after the seller accepts`}</p>
                {reveal && o.seller.phone && <p className="mt-1 text-ink-soft">Phone: {o.seller.phone}</p>}
              </>
            ) : (
              <>
                <p className="mt-2 font-medium">{o.customer.name}</p>
                {reveal && <p className="mt-1 text-ink-soft">{o.customer.email}</p>}
              </>
            )}
          </div>
          <PaymentsCard payments={o.payments} />
          <DisputesCard disputes={o.disputes} viewBase={party === "admin" ? "/admin/disputes" : "/account/disputes"} raiseHref={party !== "admin" && !["PENDING_PAYMENT", "PAYMENT_FAILED"].includes(o.status) ? `/account/disputes/new?order=${o.id}` : undefined} />
        </div>
      </div>
    </div>
  );
}
