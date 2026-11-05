import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatDay } from "@/lib/dates";
import { setUserStatusAction } from "@/app/actions/admin";
import { AdminSearch } from "@/components/admin/search-form";
import { ActionButton } from "@/components/ui/action-button";
import { Badge, PageHeader, StatusBadge, TableWrap } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const users = await db.user.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {},
    include: { sellerProfile: { select: { displayName: true } }, _count: { select: { bookings: true, purchases: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <>
      <PageHeader title="Users" description={`${users.length} shown`} />
      <AdminSearch placeholder="Search name or email" defaultValue={q} />
      <TableWrap>
        <table className="table-base min-w-[760px]">
          <thead><tr><th>User</th><th>Role</th><th>Activity</th><th>Joined</th><th>Status</th><th className="text-right">Action</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><p className="font-medium">{u.name}</p><p className="text-xs text-ink-faint">{u.email}{u.isDemo && " · demo"}</p></td>
                <td><div className="flex flex-wrap gap-1"><Badge tone={u.role === "ADMIN" ? "sky" : "neutral"}>{u.role.toLowerCase()}</Badge>{u.sellerProfile && <Badge tone="green">seller</Badge>}</div></td>
                <td className="text-sm text-ink-soft">{u._count.bookings} rentals · {u._count.purchases} buys</td>
                <td className="whitespace-nowrap text-ink-soft">{formatDay(u.createdAt)}</td>
                <td><StatusBadge status={u.status} /></td>
                <td className="text-right">
                  {u.role !== "ADMIN" && (u.status === "ACTIVE"
                    ? <ActionButton variant="ghost" action={setUserStatusAction.bind(null, u.id, "SUSPENDED")} confirm={`Suspend ${u.name}? They will be signed out.`}>Suspend</ActionButton>
                    : <ActionButton variant="secondary" action={setUserStatusAction.bind(null, u.id, "ACTIVE")}>Reactivate</ActionButton>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
