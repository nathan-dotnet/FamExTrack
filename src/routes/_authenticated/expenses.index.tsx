import { ExpenseRow } from "@/components/ExpenseRow";
import { PageFrame } from "@/components/PageFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AccountInfo } from "@/lib/account.functions";
import { COUNTED_EXPENSE_STATUSES, EXPENSE_STATUS_META, type ExpenseStatus } from "@/lib/domain";
import { money, monthLabel, recentMonths, toNumber } from "@/lib/format";
import { categoriesQuery, expensesQuery, sonsQuery } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PlusCircle } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/expenses/")({
  head: () => ({
    meta: [
      { title: "Expenses — Family Ledger" },
      {
        name: "description",
        content:
          "Search, filter and review every logged expense with receipts and approval status.",
      },
      { property: "og:title", content: "Expenses — Family Ledger" },
      { property: "og:description", content: "Every logged expense with receipts and status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExpensesPage,
});

const ALL = "all";

function ExpensesPage() {
  return (
    <PageFrame
      title="Expenses"
      subtitle="Filter by month, category and status"
      actions={(account) =>
        account.role === "son" ? (
          <Button asChild size="sm">
            <Link to="/expenses/new">
              <PlusCircle className="size-4" /> Add
            </Link>
          </Button>
        ) : null
      }
    >
      {(account) => <ExpenseList account={account} />}
    </PageFrame>
  );
}

function ExpenseList({ account }: { account: AccountInfo }) {
  const months = recentMonths(12);
  const [month, setMonth] = useState<string>(months[0] ?? ALL);
  const [categoryId, setCategoryId] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [sonId, setSonId] = useState(ALL);
  const [search, setSearch] = useState("");

  const categories = useQuery(categoriesQuery());
  const sons = useQuery(sonsQuery(account.role === "parent" ? account.userId : undefined));
  const expenses = useQuery(
    expensesQuery({
      ...(account.role === "son" ? { sonId: account.userId } : sonId !== ALL ? { sonId } : {}),
      ...(month !== ALL ? { month } : {}),
    }),
  );

  const rows = (expenses.data ?? []).filter((expense) => {
    if (categoryId !== ALL && expense.category_id !== categoryId) return false;
    if (status !== ALL && expense.status !== status) return false;
    if (search.trim() && !expense.description.toLowerCase().includes(search.trim().toLowerCase()))
      return false;
    return true;
  });
  const counted = rows
    .filter((r) => COUNTED_EXPENSE_STATUSES.includes(r.status))
    .reduce((sum, r) => sum + toNumber(r.amount), 0);

  return (
    <div className="space-y-4">
      <div className="card-surface grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          placeholder="Search description"
          value={search}
          maxLength={100}
          onChange={(e) => setSearch(e.target.value)}
          className="lg:col-span-2"
        />
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger>
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All months</SelectItem>
            {months.map((m) => (
              <SelectItem key={m} value={m}>
                {monthLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {(categories.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any status</SelectItem>
            {(Object.keys(EXPENSE_STATUS_META) as ExpenseStatus[]).map((key) => (
              <SelectItem key={key} value={key}>
                {EXPENSE_STATUS_META[key].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {account.role === "parent" ? (
          <Select value={sonId} onValueChange={setSonId}>
            <SelectTrigger>
              <SelectValue placeholder="Son" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All sons</SelectItem>
              {(sons.data ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <div className="flex items-baseline justify-between">
        <p className="text-sm text-muted-foreground">
          {rows.length} expense{rows.length === 1 ? "" : "s"}
        </p>
        <p className="money text-sm font-semibold">{money(counted)} counted against budget</p>
      </div>

      <div className="card-surface divide-y">
        {expenses.isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading expenses…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No expenses match these filters.</p>
        ) : (
          rows.map((expense) => (
            <ExpenseRow key={expense.id} expense={expense} showSon={account.role === "parent"} />
          ))
        )}
      </div>
    </div>
  );
}
