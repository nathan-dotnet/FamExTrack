import { BudgetBar } from "@/components/BudgetBar";
import { ExpenseRow } from "@/components/ExpenseRow";
import { PageFrame } from "@/components/PageFrame";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import type { AccountInfo } from "@/lib/account.functions";
import { usageTone } from "@/lib/domain";
import { money, monthKey, monthLabel, round2, toNumber } from "@/lib/format";
import {
  buildRollup,
  categoriesQuery,
  expensesQuery,
  plansQuery,
  requestsQuery,
  sonsQuery,
  transfersQuery,
} from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/family/$sonId")({
  head: () => ({
    meta: [
      { title: "Son ledger — Family Ledger" },
      {
        name: "description",
        content: "One son's monthly budget, spending by category, transfers and expense history.",
      },
      { property: "og:title", content: "Son ledger — Family Ledger" },
      { property: "og:description", content: "Budget, spending and transfers for one son." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SonLedgerPage,
});

function SonLedgerPage() {
  return (
    <PageFrame title="Son ledger" subtitle={monthLabel(monthKey())} requireRole="parent">
      {(account) => <SonLedger account={account} />}
    </PageFrame>
  );
}

function SonLedger({ account }: { account: AccountInfo }) {
  const { sonId } = useParams({ from: "/_authenticated/family/$sonId" });
  const month = monthKey();
  const sons = useQuery(sonsQuery(account.userId));
  const categories = useQuery(categoriesQuery());
  const plans = useQuery(plansQuery(sonId, month));
  const expenses = useQuery(expensesQuery({ sonId, month }));
  const requests = useQuery(requestsQuery(sonId));
  const transfers = useQuery(transfersQuery(sonId));

  const son = (sons.data ?? []).find((s) => s.id === sonId);
  const rollup = buildRollup(
    plans.data ?? [],
    requests.data ?? [],
    expenses.data ?? [],
    month,
    categories.data ?? [],
  );
  const budget = round2(rollup.reduce((s, r) => s + r.budget, 0));
  const spent = round2(rollup.reduce((s, r) => s + r.spent, 0));
  const given = (transfers.data ?? [])
    .filter((t) => t.month === month)
    .reduce((sum, t) => sum + toNumber(t.amount), 0);

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link to="/family">
          <ArrowLeft className="size-4" /> Family
        </Link>
      </Button>

      <div>
        <h2 className="font-display text-lg font-semibold">{son?.full_name ?? "Son"}</h2>
        <p className="text-xs text-muted-foreground">{son?.email}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Approved budget" value={money(budget)} hint={monthLabel(month)} />
        <StatCard label="Spent" value={money(spent)} tone={usageTone(spent, budget)} />
        <StatCard label="Money given" value={money(given)} hint="This month" />
      </div>

      <section className="card-surface p-4">
        <h3 className="font-display text-sm font-semibold">Category limits</h3>
        {rollup.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No approved budget for this month.</p>
        ) : (
          <div className="mt-2 divide-y">
            {rollup.map((row) => (
              <BudgetBar
                key={row.categoryId}
                label={row.name}
                spent={row.spent}
                budget={row.budget}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-sm font-semibold">Expenses this month</h3>
        <div className="card-surface divide-y">
          {(expenses.data ?? []).length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No expenses logged this month.</p>
          ) : (
            (expenses.data ?? []).map((expense) => (
              <ExpenseRow key={expense.id} expense={expense} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
