import { PageFrame } from "@/components/PageFrame";
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
import { TRANSFER_METHODS } from "@/lib/domain";
import { dateLabel, money, monthKey, todayISO, toNumber } from "@/lib/format";
import { sonsQuery, transfersQuery } from "@/lib/queries";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/transfers")({
  head: () => ({
    meta: [
      { title: "Money given — Family Ledger" },
      {
        name: "description",
        content: "Record every transfer of money to each son and keep a running history.",
      },
      { property: "og:title", content: "Money given — Family Ledger" },
      { property: "og:description", content: "Log and review transfers to each son." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TransfersPage,
});

function TransfersPage() {
  return (
    <PageFrame title="Money given" subtitle="Transfers to your sons" requireRole="parent">
      {(account) => <Transfers account={account} />}
    </PageFrame>
  );
}

function Transfers({ account }: { account: AccountInfo }) {
  const queryClient = useQueryClient();
  const sons = useQuery(sonsQuery(account.userId));
  const transfers = useQuery(transfersQuery());

  const [sonId, setSonId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>(TRANSFER_METHODS[0]);
  const [transferDate, setTransferDate] = useState(todayISO());
  const [reference, setReference] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("money_transfers").insert({
        parent_id: account.userId,
        son_id: sonId,
        amount: toNumber(amount),
        transfer_date: transferDate,
        month: monthKey(transferDate),
        method,
        reference: reference.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Transfer recorded.");
      setAmount("");
      setReference("");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <div className="card-surface grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <div className="space-y-1.5">
          <Label>Son</Label>
          <Select value={sonId} onValueChange={setSonId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose" />
            </SelectTrigger>
            <SelectContent>
              {(sons.data ?? [])
                .filter((s) => s.parent_id === account.userId)
                .map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tr-amount">Amount (₱)</Label>
          <Input
            id="tr-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSFER_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tr-date">Date</Label>
          <Input
            id="tr-date"
            type="date"
            max={todayISO()}
            value={transferDate}
            onChange={(e) => setTransferDate(e.target.value)}
          />
        </div>
        <Button
          disabled={!sonId || toNumber(amount) <= 0 || create.isPending}
          onClick={() => create.mutate()}
        >
          Record transfer
        </Button>
      </div>

      <div className="card-surface divide-y">
        {(transfers.data ?? []).length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No transfers recorded yet.</p>
        ) : (
          (transfers.data ?? []).map((transfer) => (
            <div key={transfer.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium">{transfer.son?.full_name ?? "Son"}</p>
                <p className="text-xs text-muted-foreground">
                  {dateLabel(transfer.transfer_date)} · {transfer.method}
                  {transfer.reference ? ` · ${transfer.reference}` : ""}
                </p>
              </div>
              <span className="money text-sm font-semibold">{money(transfer.amount)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
