import type { Metadata } from "next";
import Link from "next/link";
import { requireUserPage } from "@/lib/session";
import { DisputeDetail } from "@/components/orders/dispute-detail";

export const metadata: Metadata = { title: "Dispute" };

export default async function DisputePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor } = await requireUserPage(`/account/disputes/${id}`);
  return (
    <>
      <Link href="/account/disputes" className="mb-4 inline-block text-sm text-ink-soft hover:text-forest">← All disputes</Link>
      <DisputeDetail disputeId={id} actor={actor} />
    </>
  );
}
