import { BudgetBar } from "@/components/BudgetBar";
import { PageFrame } from "@/components/PageFrame";
import { StatCard } from "@/components/StatCard";
import { COUNTED_EXPENSE_STATUSES } from "@/lib/domain";
import { money, monthKey, monthLabel, recentMonths, round2, toNumber } from "@/lib/format";
import {
    buildRollup,
    categoriesQuery,
    expensesQuery,
    plansQuery,
    requestsQuery,
} from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Family Ledger" },
      { name: "description", content: "Spending trends by month and category across the family." },
      { property: "og:title", content: "Analytics — Family Ledger" },
      { property: "og:description", content: "Spending trends by month and category." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <PageFrame title="Analytics" subtitle="Last 6 months" requireRole="parent">
      {() => <Analytics />}
    </PageFrame>
  );
}

function Analytics() {
  const month = monthKey();
  const months = recentMonths(6);
  const categories = useQuery(categoriesQuery());
  const plans = useQuery(plansQuery());
  const requests = useQuery(requestsQuery());
  const expenses = useQuery(expensesQuery());

  const all = expenses.data ?? [];
  const counted = all.filter((e) => COUNTED_EXPENSE_STATUSES.includes(e.status));
  const perMonth = months.map((m) => ({
    month: m,
    total: round2(
      counted.filter((e) => e.month === m).reduce((sum, e) => sum + toNumber(e.amount), 0),
    ),
  }));
  const max = Math.max(1, ...perMonth.map((row) => row.total));
  const thisMonth = buildRollup(
    plans.data ?? [],
    requests.data ?? [],
    all,
    month,
    categories.data ?? [],
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Spent this month" value={money(perMonth[0]?.total ?? 0)} />
        <StatCard
          label="6-month total"
          value={money(perMonth.reduce((sum, r) => sum + r.total, 0))}
        />
        <StatCard
          label="Monthly average"
          value={money(perMonth.reduce((sum, r) => sum + r.total, 0) / (perMonth.length || 1))}
        />
      </div>

      <section className="card-surface p-4">
        <h2 className="font-display text-sm font-semibold">Spending by month</h2>
        <div className="mt-3 space-y-2">
          {perMonth.map((row) => (
            <div key={row.month} className="grid grid-cols-[8rem_1fr_6rem] items-center gap-2">
              <span className="text-xs text-muted-foreground">{monthLabel(row.month)}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(row.total / max) * 100}%` }} />
              </div>
              <span className="money text-right text-sm">{money(row.total)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card-surface p-4">
        <h2 className="font-display text-sm font-semibold">
          Budget vs spending · {monthLabel(month)}
        </h2>
        {thisMonth.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No approved budgets this month.</p>
        ) : (
          <div className="mt-2 divide-y">
            {thisMonth.map((row) => (
              <BudgetBar key={row.categoryId} label={row.name} spent={row.spent} budget={row.budget} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
