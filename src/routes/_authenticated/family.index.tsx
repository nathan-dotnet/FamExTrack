import { PageFrame } from "@/components/PageFrame";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { setSonLink } from "@/lib/family.functions";
import { sonsQuery } from "@/lib/queries";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Link2, Link2Off } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/family/")({
  head: () => ({
    meta: [
      { title: "Family — Family Ledger" },
      { name: "description", content: "Approve son accounts and open each son's spending ledger." },
      { property: "og:title", content: "Family — Family Ledger" },
      { property: "og:description", content: "Approve son accounts and review their ledgers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FamilyPage,
});

function FamilyPage() {
  return (
    <PageFrame title="Family" subtitle="Account links and access" requireRole="parent">
      {(account) => <FamilyList selfId={account.userId} />}
    </PageFrame>
  );
}

function FamilyList({ selfId }: { selfId: string }) {
  const queryClient = useQueryClient();
  const sons = useQuery(sonsQuery(selfId));
  const link = useServerFn(setSonLink);

  const mutation = useMutation({
    mutationFn: (vars: { sonId: string; action: "link" | "unlink" }) => link({ data: vars }),
    onSuccess: (_data, vars) => {
      toast.success(vars.action === "link" ? "Son account approved." : "Access revoked.");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = sons.data ?? [];

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <div className="card-surface p-6 text-sm text-muted-foreground">
          No son accounts yet. Ask your son to create an account with his own email — he will appear
          here for approval.
        </div>
      ) : (
        rows.map((son) => {
          const linked = son.link_status === "linked" && son.parent_id === selfId;
          return (
            <div key={son.id} className="card-surface flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{son.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">{son.email}</p>
              </div>
              <StatusBadge
                label={linked ? "Linked" : "Awaiting approval"}
                tone={linked ? "ok" : "warn"}
              />
              <div className="flex gap-2">
                {linked ? (
                  <>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/family/$sonId" params={{ sonId: son.id }}>
                        Ledger <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ sonId: son.id, action: "unlink" })}
                    >
                      <Link2Off className="size-4" /> Revoke
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ sonId: son.id, action: "link" })}
                  >
                    <Link2 className="size-4" /> Approve link
                  </Button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
