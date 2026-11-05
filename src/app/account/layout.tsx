import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUserPage("/account");
  const [unread, openDisputes] = await Promise.all([
    db.notification.count({ where: { userId: user.id, readAt: null } }),
    db.dispute.count({ where: { raisedById: user.id, status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
  ]);
  return (
    <DashboardShell
      title="My account"
      nav={[
        { href: "/account", label: "Overview" },
        { href: "/account/bookings", label: "My bookings" },
        { href: "/account/purchases", label: "My purchases" },
        { href: "/account/favourites", label: "Favourites" },
        { href: "/account/notifications", label: "Notifications", badge: unread },
        { href: "/account/disputes", label: "Disputes", badge: openDisputes },
        { href: "/account/transactions", label: "Transactions" },
        { href: "/account/profile", label: "Profile" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
