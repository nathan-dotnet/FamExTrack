import { PageFrame } from "@/components/PageFrame";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { dateTimeLabel } from "@/lib/format";
import { notificationsQuery } from "@/lib/queries";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Family Ledger" },
      { name: "description", content: "Approvals, rejections and overspending alerts in one place." },
      { property: "og:title", content: "Notifications — Family Ledger" },
      { property: "og:description", content: "Approvals, rejections and alerts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  return <PageFrame title="Notifications">{() => <List />}</PageFrame>;
}

function List() {
  const queryClient = useQueryClient();
  const notifications = useQuery(notificationsQuery());

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const rows = notifications.data ?? [];
  const unread = rows.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-3">
      {unread > 0 ? (
        <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
          Mark all as read ({unread})
        </Button>
      ) : null}
      <div className="card-surface divide-y">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className={`p-4 ${row.is_read ? "" : "bg-muted/50"}`}>
              <p className="text-sm font-medium">{row.title}</p>
              <p className="text-sm text-muted-foreground">{row.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">{dateTimeLabel(row.created_at)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
