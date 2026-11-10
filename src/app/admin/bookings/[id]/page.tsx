import Link from "next/link";
import { requireAdminPage } from "@/lib/session";
import { BookingDetail } from "@/components/orders/transaction-detail";

export default async function AdminBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor } = await requireAdminPage();
  return (
    <>
      <Link href="/admin/bookings" className="mb-4 inline-block text-sm text-ink-soft hover:text-brand">← All bookings</Link>
      <BookingDetail bookingId={id} actor={actor} />
    </>
  );
}
