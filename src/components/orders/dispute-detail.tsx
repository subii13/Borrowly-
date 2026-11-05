import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { DISPUTE_CATEGORY_LABEL, DISPUTE_STATUS_LABEL } from "@/lib/constants";
import { partyOf, type Actor } from "@/lib/permissions";
import { disputeNoteAction } from "@/app/actions/orders";
import { ActionButton } from "@/components/ui/action-button";
import { DefinitionList, StatusBadge } from "@/components/ui/primitives";

/** Shared dispute view for participants and admins. Admin actions are passed in as children. */
export async function DisputeDetail({ disputeId, actor, children }: { disputeId: string; actor: Actor; children?: React.ReactNode }) {
  const d = await db.dispute.findUnique({
    where: { id: disputeId },
    include: {
      raisedBy: { select: { name: true } },
      resolvedBy: { select: { name: true } },
      booking: { include: { listing: { select: { title: true } } } },
      purchaseOrder: { include: { listing: { select: { title: true } } } },
      evidence: { include: { uploadedBy: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
      refunds: true,
    },
  });
  const txn = d?.booking ?? d?.purchaseOrder;
  const party = txn && partyOf(actor, txn);
  if (!d || !txn || !party) notFound();
  const open = ["OPEN", "UNDER_REVIEW"].includes(d.status);
  const txnHref = party === "admin" ? (d.booking ? `/admin/bookings?q=${txn.code}` : `/admin/purchases?q=${txn.code}`) : d.booking ? `/account/bookings/${txn.id}` : `/account/purchases/${txn.id}`;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-ink-soft">Dispute · {d.code}</p>
        <h1 className="mt-1 text-2xl font-bold">{DISPUTE_CATEGORY_LABEL[d.category]}</h1>
        <div className="mt-2 flex items-center gap-2"><StatusBadge status={d.status} label={DISPUTE_STATUS_LABEL[d.status]} />{d.isDemo && <span className="text-xs text-ink-faint">Demonstration record</span>}</div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="font-semibold">Description</h3>
            <p className="mt-2 whitespace-pre-line text-sm text-ink-soft">{d.description}</p>
            <p className="mt-3 text-xs text-ink-faint">Raised by {d.raisedBy.name} · {formatDateTime(d.createdAt)}</p>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">Evidence & notes</h3>
              {open && party !== "admin" && <ActionButton variant="secondary" action={disputeNoteAction.bind(null, d.id)} prompt={{ label: "Add a note to this dispute", required: true }}>Add note</ActionButton>}
            </div>
            <ul className="mt-3 space-y-3 text-sm">
              {d.evidence.map((e) => (
                <li key={e.id} className="rounded-lg bg-canvas p-3">
                  <p className="text-xs text-ink-faint">{e.uploadedBy.name} · {formatDateTime(e.createdAt)}</p>
                  {e.storageKey ? (
                    <a href={`/api/evidence/${e.id}?kind=dispute`} target="_blank" rel="noreferrer" className="mt-1 block w-32 overflow-hidden rounded-lg border border-line">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/evidence/${e.id}?kind=dispute`} alt="Dispute evidence" className="aspect-[4/3] w-full object-cover" loading="lazy" />
                    </a>
                  ) : (
                    <p className="mt-1">{e.note}</p>
                  )}
                </li>
              ))}
              {!d.evidence.length && <li className="text-ink-soft">No evidence attached.</li>}
            </ul>
          </div>
          {d.resolutionNote && (
            <div className="card border-forest/30 p-5">
              <h3 className="font-semibold">Decision</h3>
              <p className="mt-2 text-sm">{d.resolutionNote}</p>
              <p className="mt-2 text-xs text-ink-faint">Refund decision: {d.refundDecision?.toLowerCase() ?? "none"} · {d.resolvedBy?.name} · {d.resolvedAt && formatDateTime(d.resolvedAt)}</p>
            </div>
          )}
          {children}
        </div>
        <aside className="space-y-6">
          <div className="card p-5">
            <h3 className="font-semibold">Transaction</h3>
            <div className="mt-2">
              <DefinitionList items={[["Reference", <Link key="r" href={txnHref} className="text-forest hover:underline">{txn.code}</Link>], ["Item", txn.listing.title], ["Type", d.booking ? "Rental" : "Purchase"], ["Amount paid", formatINR(txn.totalPaise)]]} />
            </div>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold">Refunds</h3>
            {d.refunds.length ? (
              <ul className="mt-2 space-y-1 text-sm">{d.refunds.map((r) => <li key={r.id}>{formatINR(r.amountPaise)} · {r.status.toLowerCase()}</li>)}</ul>
            ) : (
              <p className="mt-1 text-sm text-ink-soft">None recorded.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
