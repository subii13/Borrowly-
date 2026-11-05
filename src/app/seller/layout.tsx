import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUserPage("/seller");
  const sellerId = user.sellerProfile?.id;
  const [requests, orders, returns] = sellerId
    ? await Promise.all([
        db.rentalBooking.count({ where: { sellerId, status: "REQUESTED" } }),
        db.purchaseOrder.count({ where: { sellerId, status: "PLACED" } }),
        db.rentalBooking.count({ where: { sellerId, status: "RETURN_PENDING" } }),
      ])
    : [0, 0, 0];
  const nav = sellerId
    ? [
        { href: "/seller", label: "Dashboard" },
        { href: "/seller/listings", label: "My listings" },
        { href: "/seller/listings/new", label: "Create listing" },
        { href: "/seller/bookings", label: "Bookings", badge: requests },
        { href: "/seller/orders", label: "Purchases", badge: orders },
        { href: "/seller/returns", label: "Upcoming returns", badge: returns },
        { href: "/seller/earnings", label: "Earnings" },
        { href: "/seller/profile", label: "Seller profile" },
        { href: "/seller/verification", label: "Verification" },
      ]
    : [{ href: "/seller/onboarding", label: "Become a seller" }];
  return <DashboardShell title="Seller" nav={nav}>{children}</DashboardShell>;
}
