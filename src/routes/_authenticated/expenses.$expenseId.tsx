import { PageFrame } from "@/components/PageFrame";
import { ReceiptViewer } from "@/components/ReceiptViewer";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { AccountInfo } from "@/lib/account.functions";
import { EXPENSE_STATUS_META } from "@/lib/domain";
import { dateLabel, dateTimeLabel, money, toNumber } from "@/lib/format";
import { expenseQuery, expenseRevisionsQuery } from "@/lib/queries";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/expenses/$expenseId")({
  head: () => ({
    meta: [
      { title: "Expense detail — Family Ledger" },
      {
        name: "description",
        content: "Review one expense: receipt, budget impact, decision notes and revision history.",
      },
      { property: "og:title", content: "Expense detail — Family Ledger" },
      { property: "og:description", content: "Receipt, budget impact and decision history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExpenseDetailPage,
});

function ExpenseDetailPage() {
  return <PageFrame title="Expense detail">{(account) => <Detail account={account} />}</PageFrame>;
}

function Detail({ account }: { account: AccountInfo }) {
  const { expenseId } = useParams({ from: "/_authenticated/expenses/$expenseId" });
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const expense = useQuery(expenseQuery(expenseId));
  const revisions = useQuery(expenseRevisionsQuery(expenseId));

  const decide = useMutation({
    mutationFn: async (approve: boolean) => {
      const row = expense.data;
      if (!row) throw new Error("Expense not found.");
      const isException =
        row.status === "pending_exception" ||
        row.status === "exception_approved" ||
        row.status === "exception_rejected";
      const status = isException
        ? approve
          ? "exception_approved"
          : "exception_rejected"
        : approve
          ? "approved"
          : "rejected";
      const { error } = await supabase
        .from("expenses")
        .update({ status, review_note: note.trim() || null })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Decision saved.");
      setNote("");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (expense.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const row = expense.data;
  if (!row)
    return (
      <p className="text-sm text-muted-foreground">
        This expense is not available.{" "}
        <Link className="underline" to="/expenses">
          Back to expenses
        </Link>
      </p>
    );

  const meta = EXPENSE_STATUS_META[row.status];
  const over = toNumber(row.over_amount);
  const canDecide =
    account.role === "parent" &&
    (row.status === "pending_review" || row.status === "pending_exception");

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/expenses">
          <ArrowLeft className="size-4" /> All expenses
        </Link>
      </Button>

      <div className="card-surface space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="money font-display text-2xl font-semibold">{money(row.amount)}</p>
            <p className="text-sm font-medium">{row.description}</p>
            <p className="text-xs text-muted-foreground">
              {row.category?.name} · {dateLabel(row.expense_date)} · {row.son?.full_name ?? "Son"}
            </p>
          </div>
          <StatusBadge {...meta} />
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="label-caps">Limit at submit</dt>
            <dd className="money">{money(row.budget_at_submit)}</dd>
          </div>
          <div>
            <dt className="label-caps">Over budget</dt>
            <dd className={`money ${over > 0 ? "text-over" : ""}`}>{money(over)}</dd>
          </div>
          <div>
            <dt className="label-caps">Submitted</dt>
            <dd>{dateTimeLabel(row.created_at)}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2">
          {row.receipt_path ? (
            <ReceiptViewer
              expenseId={row.id}
              meta={{
                description: row.description,
                amount: money(row.amount),
                date: dateLabel(row.expense_date),
              }}
            />
          ) : (
            <p className="rounded-md bg-warn-soft px-3 py-2 text-xs text-warn-foreground">
              No receipt · {row.no_receipt_reason ?? "no reason given"}
            </p>
          )}
        </div>

        {row.overspend_reason ? (
          <p className="rounded-md bg-over-soft p-3 text-sm text-over">
            <span className="font-medium">Overspend reason:</span> {row.overspend_reason}
          </p>
        ) : null}

        {row.review_note ? (
          <p className="rounded-md bg-muted p-3 text-sm">
            <span className="font-medium">Parent note:</span> {row.review_note}
          </p>
        ) : null}
      </div>

      {canDecide ? (
        <div className="card-surface space-y-3 p-5">
          <h2 className="font-display text-sm font-semibold">Your decision</h2>
          <Textarea
            rows={3}
            maxLength={300}
            placeholder="Optional note for your son"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2">
            <Button disabled={decide.isPending} onClick={() => decide.mutate(true)}>
              Approve
            </Button>
            <Button
              variant="outline"
              disabled={decide.isPending}
              onClick={() => decide.mutate(false)}
            >
              Reject
            </Button>
          </div>
        </div>
      ) : null}

      <div className="card-surface p-5">
        <h2 className="font-display text-sm font-semibold">History</h2>
        {(revisions.data ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No edits recorded — this is the original submission.
          </p>
        ) : (
          <ol className="mt-2 space-y-2 text-sm">
            {(revisions.data ?? []).map((rev) => (
              <li key={rev.id} className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">{dateTimeLabel(rev.created_at)}</p>
                <p>{rev.note ?? "Expense updated"}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
