import type { Metadata } from "next";
import Link from "next/link";
import { requireSellerPage } from "@/lib/session";
import { BookingDetail } from "@/components/orders/transaction-detail";

export const metadata: Metadata = { title: "Booking" };

export default async function SellerBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor } = await requireSellerPage();
  return (
    <>
      <Link href="/seller/bookings" className="mb-4 inline-block text-sm text-ink-soft hover:text-forest">← All bookings</Link>
      <BookingDetail bookingId={id} actor={actor} />
    </>
  );
}
