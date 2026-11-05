import type { Metadata } from "next";
import Link from "next/link";
import { BellOff } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/session";
import { formatDateTime } from "@/lib/dates";
import { markNotificationsReadAction } from "@/app/actions/orders";
import { ActionButton } from "@/components/ui/action-button";
import { EmptyState, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const { user } = await requireUserPage("/account/notifications");
  const notes = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  const unread = notes.filter((n) => !n.readAt).length;
  return (
    <>
      <PageHeader title="Notifications" description={`${unread} unread`} actions={unread > 0 ? <ActionButton variant="secondary" action={markNotificationsReadAction}>Mark all as read</ActionButton> : undefined} />
      {notes.length ? (
        <ul className="card divide-y divide-line">
          {notes.map((n) => (
            <li key={n.id} className={n.readAt ? "" : "bg-forest-50/40"}>
              <Link href={n.link ?? "#"} className="flex gap-3 p-4">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-forest"}`} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{n.title}</span>
                  <span className="block text-sm text-ink-soft">{n.body}</span>
                  <span className="mt-1 block text-xs text-ink-faint">{formatDateTime(n.createdAt)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={BellOff} title="You're all caught up" body="Booking, order and dispute updates will appear here." />
      )}
    </>
  );
}
