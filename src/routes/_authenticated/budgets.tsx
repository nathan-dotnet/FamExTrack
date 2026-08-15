import { PageFrame } from "@/components/PageFrame";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { ITEM_STATUS_META, PLAN_STATUS_META } from "@/lib/domain";
import { money, monthLabel, toNumber } from "@/lib/format";
import { plansQuery } from "@/lib/queries";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/budgets")({
  head: () => ({
    meta: [
      { title: "Budget requests — Family Ledger" },
      {
        name: "description",
        content: "Review each son's monthly budget request and approve or reduce every line item.",
      },
      { property: "og:title", content: "Budget requests — Family Ledger" },
      { property: "og:description", content: "Approve, reduce or reject budget line items." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BudgetsPage,
});

function BudgetsPage() {
  return (
    <PageFrame title="Budget requests" subtitle="Approve or adjust each line" requireRole="parent">
      {() => <PlanReview />}
    </PageFrame>
  );
}

function PlanReview() {
  const queryClient = useQueryClient();
  const plans = useQuery(plansQuery());
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const decideItem = useMutation({
    mutationFn: async (vars: { itemId: string; status: "approved" | "reduced" | "rejected"; amount: number }) => {
      const { error } = await supabase
        .from("budget_items")
        .update({ status: vars.status, approved_amount: vars.amount })
        .eq("id", vars.itemId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (error: Error) => toast.error(error.message),
  });

  const finishPlan = useMutation({
    mutationFn: async (vars: { planId: string; status: "approved" | "partially_approved" | "rejected" }) => {
      const { error } = await supabase
        .from("budget_plans")
        .update({ status: vars.status, reviewed_at: new Date().toISOString() })
        .eq("id", vars.planId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Budget decision saved.");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = plans.data ?? [];

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <div className="card-surface p-6 text-sm text-muted-foreground">
          No budget plans submitted yet.
        </div>
      ) : (
        rows.map((plan) => {
          const pending = plan.status === "submitted" || plan.status === "under_review";
          return (
            <div key={plan.id} className="card-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{plan.son?.full_name ?? "Son"}</p>
                  <p className="text-xs text-muted-foreground">{monthLabel(plan.month)}</p>
                </div>
                <StatusBadge {...PLAN_STATUS_META[plan.status]} />
              </div>

              <div className="mt-3 divide-y">
                {(plan.items ?? []).map((item) => {
                  const key = item.id;
                  const value =
                    amounts[key] ??
                    String(item.approved_amount ?? item.requested_amount);
                  return (
                    <div key={key} className="flex flex-wrap items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{item.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.category?.name} · asked {money(item.requested_amount)}
                        </p>
                      </div>
                      <StatusBadge {...ITEM_STATUS_META[item.status]} />
                      {pending ? (
                        <>
                          <Input
                            className="w-28"
                            type="number"
                            min="0"
                            step="0.01"
                            value={value}
                            onChange={(e) =>
                              setAmounts((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                          />
                          <Button
                            size="sm"
                            disabled={decideItem.isPending}
                            onClick={() =>
                              decideItem.mutate({
                                itemId: key,
                                status:
                                  toNumber(value) >= toNumber(item.requested_amount)
                                    ? "approved"
                                    : "reduced",
                                amount: toNumber(value),
                              })
                            }
                          >
                            Set
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={decideItem.isPending}
                            onClick={() =>
                              decideItem.mutate({ itemId: key, status: "rejected", amount: 0 })
                            }
                          >
                            Reject
                          </Button>
                        </>
                      ) : (
                        <span className="money w-28 text-right text-sm font-semibold">
                          {item.approved_amount === null ? "—" : money(item.approved_amount)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {pending ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    disabled={finishPlan.isPending}
                    onClick={() => finishPlan.mutate({ planId: plan.id, status: "approved" })}
                  >
                    Approve budget
                  </Button>
                  <Button
                    variant="outline"
                    disabled={finishPlan.isPending}
                    onClick={() =>
                      finishPlan.mutate({ planId: plan.id, status: "partially_approved" })
                    }
                  >
                    Approve partially
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={finishPlan.isPending}
                    onClick={() => finishPlan.mutate({ planId: plan.id, status: "rejected" })}
                  >
                    Reject
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}
