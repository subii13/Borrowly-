import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { AdminSearch } from "@/components/admin/search-form";
import { PageHeader, TableWrap } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Audit logs" };

export default async function AuditLogs({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const logs = await db.auditLog.findMany({
    where: q ? { OR: [{ action: { contains: q, mode: "insensitive" } }, { entityType: { contains: q, mode: "insensitive" } }, { entityId: q }] } : {},
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return (
    <>
      <PageHeader title="Audit logs" description="Append-only record of sensitive actions: logins, payments, handovers, moderation, refunds and settings changes." />
      <AdminSearch placeholder="Filter by action or entity" defaultValue={q} />
      <TableWrap>
        <table className="table-base min-w-[820px]">
          <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap text-ink-soft">{formatDateTime(l.createdAt)}</td>
                <td className="text-sm">{l.actor?.name ?? "System"}<span className="block text-xs text-ink-faint">{l.actor?.email}</span></td>
                <td className="font-mono text-xs">{l.action}</td>
                <td className="text-xs text-ink-soft">{l.entityType}<span className="block font-mono text-ink-faint">{l.entityId.slice(0, 14)}</span></td>
                <td className="max-w-xs truncate font-mono text-xs text-ink-faint">{l.metadata ? JSON.stringify(l.metadata) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
