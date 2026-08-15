import { StatusBadge } from "@/components/StatusBadge";
import { EXPENSE_STATUS_META } from "@/lib/domain";
import { dateLabel, money, toNumber } from "@/lib/format";
import type { ExpenseRow as Row } from "@/lib/queries";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ImageOff, Paperclip } from "lucide-react";

export function ExpenseRow({ expense, showSon = false }: { expense: Row; showSon?: boolean }) {
  const over = toNumber(expense.over_amount) > 0;
  return (
    <Link
      to="/expenses/$expenseId"
      params={{ expenseId: expense.id }}
      className="flex flex-wrap items-center gap-3 p-4 hover:bg-muted/60"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{expense.description}</p>
        <p className="truncate text-xs text-muted-foreground">
          {showSon ? `${expense.son?.full_name ?? "Son"} · ` : ""}
          {expense.category?.name} · {dateLabel(expense.expense_date)}
          {expense.submission_count > 1 ? ` · revision ${expense.submission_count}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        {expense.receipt_path ? (
          <span title="Receipt attached">
            <Paperclip className="size-4" />
          </span>
        ) : (
          <span title="No receipt">
            <ImageOff className="size-4 text-warn-foreground" />
          </span>
        )}
        {over ? (
          <span title="Over budget">
            <AlertTriangle className="size-4 text-over" />
          </span>
        ) : null}
      </div>
      <span className="money w-28 text-right text-sm font-semibold">{money(expense.amount)}</span>
      <StatusBadge {...EXPENSE_STATUS_META[expense.status]} />
    </Link>
  );
}
