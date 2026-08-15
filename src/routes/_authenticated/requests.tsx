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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { AccountInfo } from "@/lib/account.functions";
import { REQUEST_STATUS_META } from "@/lib/domain";
import { money, monthKey, monthLabel, toNumber } from "@/lib/format";
import { categoriesQuery, requestsQuery } from "@/lib/queries";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/requests")({
  head: () => ({
    meta: [
      { title: "Extra money requests — Family Ledger" },
      {
        name: "description",
        content: "Ask for additional money with a reason, and let the parent approve or reduce it.",
      },
      { property: "og:title", content: "Extra money requests — Family Ledger" },
      { property: "og:description", content: "Request and approve additional money per category." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  return (
    <PageFrame title="Extra money" subtitle="Requests beyond the approved budget">
      {(account) => <Requests account={account} />}
    </PageFrame>
  );
}

function Requests({ account }: { account: AccountInfo }) {
  const queryClient = useQueryClient();
  const month = monthKey();
  const categories = useQuery(categoriesQuery());
  const requests = useQuery(requestsQuery(account.role === "son" ? account.userId : undefined));

  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [approvals, setApprovals] = useState<Record<string, string>>({});

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("additional_money_requests").insert({
        son_id: account.userId,
        category_id: categoryId,
        month,
        requested_amount: toNumber(amount),
        reason: reason.trim(),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Request sent.");
      setCategoryId("");
      setAmount("");
      setReason("");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const decide = useMutation({
    mutationFn: async (vars: { id: string; status: "approved" | "partially_approved" | "rejected"; amount: number }) => {
      const { error } = await supabase
        .from("additional_money_requests")
        .update({ status: vars.status, approved_amount: vars.amount })
        .eq("id", vars.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Decision saved.");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      {account.role === "son" ? (
        <div className="card-surface grid gap-3 p-4 sm:grid-cols-2">
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
            <Label htmlFor="req-amount">Amount (₱)</Label>
            <Input
              id="req-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="req-reason">Why do you need it?</Label>
            <Textarea
              id="req-reason"
              rows={2}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div>
            <Button
              disabled={
                !categoryId || toNumber(amount) <= 0 || reason.trim().length < 10 || create.isPending
              }
              onClick={() => create.mutate()}
            >
              Send request for {monthLabel(month)}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="card-surface divide-y">
        {(requests.data ?? []).length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No extra money requests yet.</p>
        ) : (
          (requests.data ?? []).map((request) => {
            const value = approvals[request.id] ?? String(request.requested_amount);
            return (
              <div key={request.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {request.category?.name} · {money(request.requested_amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {account.role === "parent" ? `${request.son?.full_name ?? "Son"} · ` : ""}
                    {monthLabel(request.month)} · {request.reason}
                  </p>
                </div>
                <StatusBadge {...REQUEST_STATUS_META[request.status]} />
                {account.role === "parent" && request.status === "pending" ? (
                  <>
                    <Input
                      className="w-28"
                      type="number"
                      min="0"
                      step="0.01"
                      value={value}
                      onChange={(e) =>
                        setApprovals((prev) => ({ ...prev, [request.id]: e.target.value }))
                      }
                    />
                    <Button
                      size="sm"
                      disabled={decide.isPending}
                      onClick={() =>
                        decide.mutate({
                          id: request.id,
                          status:
                            toNumber(value) >= toNumber(request.requested_amount)
                              ? "approved"
                              : "partially_approved",
                          amount: toNumber(value),
                        })
                      }
                    >
                      Grant
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ id: request.id, status: "rejected", amount: 0 })}
                    >
                      Reject
                    </Button>
                  </>
                ) : (
                  <span className="money w-24 text-right text-sm font-semibold text-ok">
                    {request.approved_amount === null ? "—" : money(request.approved_amount)}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
