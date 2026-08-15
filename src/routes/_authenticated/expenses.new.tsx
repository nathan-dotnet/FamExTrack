import { BudgetBar } from "@/components/BudgetBar";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { AccountInfo } from "@/lib/account.functions";
import { MAX_RECEIPT_BYTES, RECEIPT_MIME_TYPES } from "@/lib/domain";
import { money, monthKey, monthLabel, todayISO, toNumber } from "@/lib/format";
import { buildRollup, categoriesQuery, expensesQuery, plansQuery, requestsQuery } from "@/lib/queries";
import { uploadReceipt } from "@/lib/receipts.functions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/expenses/new")({
  head: () => ({
    meta: [
      { title: "Log an expense — Family Ledger" },
      {
        name: "description",
        content: "Record a new expense with its receipt and see the remaining budget instantly.",
      },
      { property: "og:title", content: "Log an expense — Family Ledger" },
      { property: "og:description", content: "Record an expense with its receipt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewExpensePage,
});

function NewExpensePage() {
  return (
    <PageFrame title="Log an expense" subtitle="Receipts keep approvals fast" requireRole="son">
      {(account) => <NewExpenseForm account={account} />}
    </PageFrame>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}

function NewExpenseForm({ account }: { account: AccountInfo }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const upload = useServerFn(uploadReceipt);

  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [noReceiptReason, setNoReceiptReason] = useState("");
  const [overspendReason, setOverspendReason] = useState("");

  const month = monthKey(expenseDate);
  const categories = useQuery(categoriesQuery());
  const plans = useQuery(plansQuery(account.userId, month));
  const requests = useQuery(requestsQuery(account.userId));
  const expenses = useQuery(expensesQuery({ sonId: account.userId, month }));

  const rollup = useMemo(
    () =>
      buildRollup(
        plans.data ?? [],
        requests.data ?? [],
        expenses.data ?? [],
        month,
        categories.data ?? [],
      ),
    [plans.data, requests.data, expenses.data, month, categories.data],
  );

  const selected = rollup.find((r) => r.categoryId === categoryId);
  const budget = selected?.budget ?? 0;
  const spent = selected?.spent ?? 0;
  const amountValue = toNumber(amount);
  const projected = spent + amountValue;
  const willOverspend = amountValue > 0 && projected > budget;

  const mutation = useMutation({
    mutationFn: async () => {
      let receipt: { path: string; filename: string; mime: string; size: number } | null = null;
      if (file) {
        receipt = await upload({
          data: {
            filename: file.name,
            mime: file.type as (typeof RECEIPT_MIME_TYPES)[number],
            base64: await fileToBase64(file),
          },
        });
      }

      const { data, error } = await supabase
        .from("expenses")
        .insert({
          son_id: account.userId,
          category_id: categoryId,
          amount: amountValue,
          expense_date: expenseDate,
          month,
          description: description.trim(),
          receipt_path: receipt?.path ?? null,
          receipt_filename: receipt?.filename ?? null,
          receipt_mime: receipt?.mime ?? null,
          receipt_size: receipt?.size ?? null,
          receipt_uploaded_at: receipt ? new Date().toISOString() : null,
          no_receipt_reason: receipt ? null : noReceiptReason.trim() || null,
          overspend_reason: overspendReason.trim() || null,
        })
        .select("id, status")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      toast.success(
        data.status === "pending_exception"
          ? "Submitted — your parent must approve the exception."
          : "Expense submitted for review.",
      );
      navigate({ to: "/expenses/$expenseId", params: { expenseId: data.id } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!categoryId) {
      toast.error("Choose a category.");
      return;
    }
    if (amountValue <= 0) {
      toast.error("Enter an amount greater than zero.");
      return;
    }
    if (description.trim().length < 3) {
      toast.error("Describe what the money was for.");
      return;
    }
    if (!file && noReceiptReason.trim().length < 10) {
      toast.error("Attach a receipt, or explain in at least 10 characters why there is none.");
      return;
    }
    if (willOverspend && overspendReason.trim().length < 10) {
      toast.error("This goes over the limit — give a reason of at least 10 characters.");
      return;
    }
    mutation.mutate();
  };

  return (
    <form className="grid gap-4 lg:grid-cols-[1fr_20rem]" onSubmit={submit}>
      <div className="card-surface space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose category" />
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
            <Label htmlFor="amount">Amount (₱)</Label>
            <Input
              id="amount"
              inputMode="decimal"
              type="number"
              min="0.01"
              step="0.01"
              max="1000000"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              required
              max={todayISO()}
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Counts toward {monthLabel(month)}</p>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">What was it for?</Label>
            <Input
              id="description"
              required
              maxLength={200}
              placeholder="e.g. Lunch at campus canteen"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2 rounded-lg border p-3">
          <Label htmlFor="receipt">Receipt</Label>
          {file ? (
            <div className="flex items-center justify-between gap-2 rounded-md bg-muted p-2 text-sm">
              <span className="truncate">{file.name}</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => setFile(null)}>
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <Input
              id="receipt"
              type="file"
              accept={RECEIPT_MIME_TYPES.join(",")}
              onChange={(event) => {
                const picked = event.target.files?.[0] ?? null;
                if (!picked) return;
                if (!RECEIPT_MIME_TYPES.includes(picked.type as (typeof RECEIPT_MIME_TYPES)[number])) {
                  toast.error("Use a JPG, PNG, WEBP image or a PDF.");
                  return;
                }
                if (picked.size > MAX_RECEIPT_BYTES) {
                  toast.error("That file is larger than 8 MB.");
                  return;
                }
                setFile(picked);
              }}
            />
          )}
          {!file ? (
            <div className="space-y-1.5">
              <Label htmlFor="no-receipt" className="text-xs text-warn-foreground">
                No receipt? Explain why (required)
              </Label>
              <Textarea
                id="no-receipt"
                rows={2}
                maxLength={300}
                placeholder="e.g. Jeepney fare, no receipt issued"
                value={noReceiptReason}
                onChange={(e) => setNoReceiptReason(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Expenses without a receipt always need your parent's approval.
              </p>
            </div>
          ) : null}
        </div>

        {willOverspend ? (
          <div className="space-y-1.5 rounded-lg border border-over/30 bg-over-soft p-3">
            <Label htmlFor="overspend" className="text-over">
              This exceeds the limit by {money(projected - budget)} — reason required
            </Label>
            <Textarea
              id="overspend"
              rows={2}
              maxLength={300}
              value={overspendReason}
              onChange={(e) => setOverspendReason(e.target.value)}
              placeholder="Explain why this purchase was necessary"
            />
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Submit expense
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate({ to: "/expenses" })}>
            Cancel
          </Button>
        </div>
      </div>

      <aside className="card-surface h-fit p-4">
        <h2 className="font-display text-sm font-semibold">Budget check</h2>
        {!categoryId ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Pick a category to see how much is left for {monthLabel(month)}.
          </p>
        ) : (
          <div className="mt-2 space-y-3">
            <BudgetBar label={selected?.name ?? "Category"} spent={spent} budget={budget} />
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">This expense</dt>
                <dd className="money">{money(amountValue)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">After submitting</dt>
                <dd className="money font-semibold">{money(projected)}</dd>
              </div>
            </dl>
            {willOverspend ? (
              <p className="text-xs text-over">
                Over by {money(projected - budget)}. It will be held for parent approval.
              </p>
            ) : null}
          </div>
        )}
      </aside>
    </form>
  );
}
