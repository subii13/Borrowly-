import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { requireUserPage } from "@/lib/session";
import { BookingDetail } from "@/components/orders/transaction-detail";
import { ListenButton } from "@/components/voice/listen-button";

export const metadata: Metadata = { title: "Booking" };

export default async function BookingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = await params;
  const { actor } = await requireUserPage(`/account/bookings/${id}`);
  const isNew = (await searchParams).new === "1";
  return (
    <>
      <Link href="/account/bookings" className="mb-4 inline-block text-sm text-ink-soft hover:text-brand">← All bookings</Link>
      {isNew && (
        <div className="mb-6 flex items-start gap-3 rounded-xl bg-brand-50 p-4 text-brand" role="status">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Booking request sent</p>
            <p className="text-sm">Your demo payment succeeded. The seller will confirm shortly — we&apos;ll notify you.</p>
          </div>
        </div>
      )}
      <div className="mb-4 flex justify-end">
        <ListenButton src={`/api/voice/reply?kind=booking&id=${encodeURIComponent(id)}`} label="கேட்க / Hear this booking in Tamil" />
      </div>
      <BookingDetail bookingId={id} actor={actor} />
    </>
  );
}
