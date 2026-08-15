import { PageFrame } from "@/components/PageFrame";
import { dateTimeLabel, money } from "@/lib/format";
import { auditQuery } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/audit-log")({
  head: () => ({
    meta: [
      { title: "Audit log — Family Ledger" },
      {
        name: "description",
        content: "Every submission, approval and change with who did it and when.",
      },
      { property: "og:title", content: "Audit log — Family Ledger" },
      { property: "og:description", content: "Full history of submissions and approvals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  return (
    <PageFrame title="Audit log" subtitle="Who changed what, and when" requireRole="parent">
      {() => <AuditList />}
    </PageFrame>
  );
}

function AuditList() {
  const audit = useQuery(auditQuery());
  const rows = audit.data ?? [];

  return (
    <div className="card-surface divide-y">
      {rows.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">No activity recorded yet.</p>
      ) : (
        rows.map((row) => (
          <div key={row.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {row.actor_name ?? "System"} · {row.action}
              </p>
              <p className="text-xs text-muted-foreground">
                {row.entity} · {dateTimeLabel(row.created_at)}
              </p>
            </div>
            {row.amount ? <span className="money text-sm">{money(row.amount)}</span> : null}
          </div>
        ))
      )}
    </div>
  );
}
