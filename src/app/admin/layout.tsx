import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  const [pending, disputes, refunds] = await Promise.all([
    db.sellerProfile.count({ where: { verificationStatus: "PENDING" } }),
    db.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    db.refund.count({ where: { status: "PENDING" } }),
  ]);
  return (
    <DashboardShell
      title="Admin"
      nav={[
        { href: "/admin", label: "Overview" },
        { href: "/admin/users", label: "Users" },
        { href: "/admin/sellers", label: "Sellers" },
        { href: "/admin/verification", label: "Seller verification", badge: pending },
        { href: "/admin/listings", label: "Listings" },
        { href: "/admin/bookings", label: "Bookings" },
        { href: "/admin/purchases", label: "Purchases" },
        { href: "/admin/disputes", label: "Disputes", badge: disputes },
        { href: "/admin/refunds", label: "Refunds", badge: refunds },
        { href: "/admin/reports", label: "Reports" },
        { href: "/admin/audit-logs", label: "Audit logs" },
        { href: "/admin/settings", label: "Settings" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
