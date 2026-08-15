import { PageFrame } from "@/components/PageFrame";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { AccountInfo } from "@/lib/account.functions";
import { ITEM_STATUS_META, PLAN_STATUS_META } from "@/lib/domain";
import { money, monthKey, monthLabel, toNumber } from "@/lib/format";
import { categoriesQuery, plansQuery } from "@/lib/queries";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/budget")({
  head: () => ({
    meta: [
      { title: "My budget — Family Ledger" },
      {
        name: "description",
        content: "Build your monthly budget by category and send it to your parent for approval.",
      },
      { property: "og:title", content: "My budget — Family Ledger" },
      { property: "og:description", content: "Plan your month and request approval." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BudgetPage,
});

function BudgetPage() {
  const month = monthKey();
  return (
    <PageFrame title="My budget" subtitle={monthLabel(month)} requireRole="son">
      {(account) => <BudgetEditor account={account} month={month} />}
    </PageFrame>
  );
}

function BudgetEditor({ account, month }: { account: AccountInfo; month: string }) {
  const queryClient = useQueryClient();
  const categories = useQuery(categoriesQuery());
  const plans = useQuery(plansQuery(account.userId, month));
  const plan = (plans.data ?? [])[0];
  const editable = !plan || plan.status === "draft" || plan.status === "rejected";

  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const invalidate = () => queryClient.invalidateQueries();

  const addItem = useMutation({
    mutationFn: async () => {
      let planId = plan?.id;
      if (!planId) {
        const { data, error } = await supabase
          .from("budget_plans")
          .insert({ son_id: account.userId, month })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        planId = data.id;
      }
      const { error } = await supabase.from("budget_items").insert({
        plan_id: planId,
        category_id: categoryId,
        description: description.trim(),
        requested_amount: toNumber(amount),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setCategoryId("");
      setAmount("");
      setDescription("");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budget_items").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const submitPlan = useMutation({
    mutationFn: async () => {
      if (!plan) throw new Error("Add at least one item first.");
      const { error } = await supabase
        .from("budget_plans")
        .update({ status: "submitted", submitted_at: new Date().toISOString() })
        .eq("id", plan.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Budget sent to your parent.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const items = plan?.items ?? [];
  const requested = items.reduce((s, i) => s + toNumber(i.requested_amount), 0);
  const approved = items.reduce((s, i) => s + toNumber(i.approved_amount), 0);

  return (
    <div className="space-y-4">
      <div className="card-surface flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-muted-foreground">Requested</p>
          <p className="money font-display text-xl font-semibold">{money(requested)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Approved</p>
          <p className="money font-display text-xl font-semibold text-ok">{money(approved)}</p>
        </div>
        {plan ? <StatusBadge {...PLAN_STATUS_META[plan.status]} /> : null}
        {editable ? (
          <Button
            disabled={items.length === 0 || submitPlan.isPending}
            onClick={() => submitPlan.mutate()}
          >
            <Send className="size-4" /> Send for approval
          </Button>
        ) : null}
      </div>

      {editable ? (
        <div className="card-surface grid gap-3 p-4 sm:grid-cols-[1fr_1fr_8rem_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                {(categories.data ?? [])
                  .filter((c) => c.is_active)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="item-desc">What for?</Label>
            <Input
              id="item-desc"
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="item-amount">Amount (₱)</Label>
            <Input
              id="item-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <Button
            disabled={!categoryId || toNumber(amount) <= 0 || addItem.isPending}
            onClick={() => addItem.mutate()}
          >
            <Plus className="size-4" /> Add
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          This budget is already with your parent, so it can't be edited.
        </p>
      )}

      <div className="card-surface divide-y">
        {items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No items yet. Add categories and amounts, then send the plan for approval.
          </p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.description}</p>
                <p className="text-xs text-muted-foreground">
                  {item.category?.name}
                  {item.parent_note ? ` · ${item.parent_note}` : ""}
                </p>
              </div>
              <span className="money text-sm">{money(item.requested_amount)}</span>
              <span className="money w-24 text-right text-sm font-semibold text-ok">
                {item.approved_amount === null ? "—" : money(item.approved_amount)}
              </span>
              <StatusBadge {...ITEM_STATUS_META[item.status]} />
              {editable ? (
                <Button variant="ghost" size="icon" onClick={() => removeItem.mutate(item.id)}>
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
