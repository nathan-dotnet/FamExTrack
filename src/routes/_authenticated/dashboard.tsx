import { BudgetBar } from "@/components/BudgetBar";
import { PageFrame } from "@/components/PageFrame";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import type { AccountInfo } from "@/lib/account.functions";
import {
  COUNTED_EXPENSE_STATUSES,
  EXPENSE_STATUS_META,
  PENDING_EXPENSE_STATUSES,
  PLAN_STATUS_META,
  usageTone,
} from "@/lib/domain";
import { dateLabel, money, monthKey, monthLabel, round2, toNumber } from "@/lib/format";
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
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ClipboardList, Receipt, TrendingUp, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Family Ledger" },
      {
        name: "description",
        content: "Monthly budget usage, pending approvals and recent spending at a glance.",
      },
      { property: "og:title", content: "Dashboard — Family Ledger" },
      { property: "og:description", content: "Monthly budget usage and pending approvals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const month = monthKey();
  return (
    <PageFrame title="Overview" subtitle={monthLabel(month)}>
      {(account) =>
        account.role === "parent" ? (
          <ParentDashboard month={month} account={account} />
        ) : (
          <SonDashboard month={month} account={account} />
        )
      }
    </PageFrame>
  );
}

function ParentDashboard({ month, account }: { month: string; account: AccountInfo }) {
  const sons = useQuery(sonsQuery(account.userId));
  const categories = useQuery(categoriesQuery());
  const plans = useQuery(plansQuery(undefined, month));
  const expenses = useQuery(expensesQuery({ month }));
  const requests = useQuery(requestsQuery());
  const transfers = useQuery(transfersQuery());

  const allExpenses = expenses.data ?? [];
  const pendingExpenses = allExpenses.filter((e) => PENDING_EXPENSE_STATUSES.includes(e.status));
  const exceptions = allExpenses.filter((e) => e.status === "pending_exception");
  const pendingPlans = (plans.data ?? []).filter(
    (p) => p.status === "submitted" || p.status === "under_review",
  );
  const pendingRequests = (requests.data ?? []).filter((r) => r.status === "pending");
  const givenThisMonth = (transfers.data ?? [])
    .filter((t) => t.month === month)
    .reduce((sum, t) => sum + toNumber(t.amount), 0);
  const spentThisMonth = allExpenses
    .filter((e) => COUNTED_EXPENSE_STATUSES.includes(e.status))
    .reduce((sum, e) => sum + toNumber(e.amount), 0);

  const linkedSons = (sons.data ?? []).filter((s) => s.parent_id === account.userId);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Spent this month"
          value={money(spentThisMonth)}
          hint={`${allExpenses.length} expense${allExpenses.length === 1 ? "" : "s"} logged`}
          icon={<Receipt className="size-4" />}
        />
        <StatCard
          label="Money given"
          value={money(givenThisMonth)}
          hint="Transfers recorded this month"
          icon={<Wallet className="size-4" />}
        />
        <StatCard
          label="Waiting on you"
          value={pendingExpenses.length + pendingPlans.length + pendingRequests.length}
          hint={`${pendingExpenses.length} expenses · ${pendingPlans.length} budgets · ${pendingRequests.length} requests`}
          tone={
            pendingExpenses.length + pendingPlans.length + pendingRequests.length > 0
              ? "warn"
              : "ok"
          }
          icon={<ClipboardList className="size-4" />}
        />
        <StatCard
          label="Overspending flags"
          value={exceptions.length}
          hint="Expenses beyond the approved limit"
          tone={exceptions.length > 0 ? "over" : "ok"}
          icon={<TrendingUp className="size-4" />}
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">Sons this month</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/family">
              Manage family <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        {linkedSons.length === 0 ? (
          <div className="card-surface p-6 text-sm text-muted-foreground">
            No linked son accounts yet. Ask your son to sign up, then approve the link on the{" "}
            <Link className="underline" to="/family">
              Family
            </Link>{" "}
            page.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {linkedSons.map((son) => {
              const rollup = buildRollup(
                (plans.data ?? []).filter((p) => p.son_id === son.id),
                (requests.data ?? []).filter((r) => r.son_id === son.id),
                allExpenses.filter((e) => e.son_id === son.id),
                month,
                categories.data ?? [],
              );
              const budget = round2(rollup.reduce((s, r) => s + r.budget, 0));
              const spent = round2(rollup.reduce((s, r) => s + r.spent, 0));
              const sonPending = allExpenses.filter(
                (e) => e.son_id === son.id && PENDING_EXPENSE_STATUSES.includes(e.status),
              ).length;

              return (
                <div key={son.id} className="card-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{son.full_name}</p>
                      <p className="text-xs text-muted-foreground">{son.email}</p>
                    </div>
                    <StatusBadge
                      label={sonPending > 0 ? `${sonPending} to review` : "Up to date"}
                      tone={sonPending > 0 ? "warn" : "ok"}
                    />
                  </div>

                  <div className="mt-3">
                    <BudgetBar label="Total budget" spent={spent} budget={budget} />
                  </div>

                  <div className="mt-2 space-y-1">
                    {rollup.slice(0, 3).map((row) => (
                      <BudgetBar
                        key={row.categoryId}
                        label={row.name}
                        spent={row.spent}
                        budget={row.budget}
                        compact
                      />
                    ))}
                  </div>

                  <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                    <Link to="/family/$sonId" params={{ sonId: son.id }}>
                      Open {son.full_name.split(" ")[0]}'s ledger
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-base font-semibold">Needs a decision</h2>
        <div className="card-surface divide-y">
          {pendingExpenses.length === 0 &&
          pendingPlans.length === 0 &&
          pendingRequests.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Nothing is waiting for approval.</p>
          ) : null}

          {pendingPlans.map((plan) => (
            <Link
              key={plan.id}
              to="/budgets"
              className="flex items-center justify-between gap-3 p-4 hover:bg-muted/60"
            >
              <div>
                <p className="text-sm font-medium">Budget plan · {plan.son?.full_name ?? "Son"}</p>
                <p className="text-xs text-muted-foreground">
                  {monthLabel(plan.month)} · {plan.items?.length ?? 0} items
                </p>
              </div>
              <StatusBadge {...PLAN_STATUS_META[plan.status]} />
            </Link>
          ))}

          {pendingExpenses.slice(0, 8).map((expense) => (
            <Link
              key={expense.id}
              to="/expenses/$expenseId"
              params={{ expenseId: expense.id }}
              className="flex items-center justify-between gap-3 p-4 hover:bg-muted/60"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{expense.description}</p>
                <p className="text-xs text-muted-foreground">
                  {expense.son?.full_name ?? "Son"} · {expense.category?.name} ·{" "}
                  {dateLabel(expense.expense_date)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="money text-sm font-semibold">{money(expense.amount)}</span>
                <StatusBadge {...EXPENSE_STATUS_META[expense.status]} />
              </div>
            </Link>
          ))}

          {pendingRequests.map((request) => (
            <Link
              key={request.id}
              to="/requests"
              className="flex items-center justify-between gap-3 p-4 hover:bg-muted/60"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  Extra money · {request.category?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {request.son?.full_name ?? "Son"} · {monthLabel(request.month)}
                </p>
              </div>
              <span className="money text-sm font-semibold">{money(request.requested_amount)}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function SonDashboard({ month, account }: { month: string; account: AccountInfo }) {
  const categories = useQuery(categoriesQuery());
  const plans = useQuery(plansQuery(account.userId, month));
  const expenses = useQuery(expensesQuery({ sonId: account.userId, month }));
  const requests = useQuery(requestsQuery(account.userId));
  const transfers = useQuery(transfersQuery(account.userId));

  const rollup = buildRollup(
    plans.data ?? [],
    requests.data ?? [],
    expenses.data ?? [],
    month,
    categories.data ?? [],
  );
  const budget = round2(rollup.reduce((s, r) => s + r.budget, 0));
  const spent = round2(rollup.reduce((s, r) => s + r.spent, 0));
  const received = (transfers.data ?? [])
    .filter((t) => t.month === month)
    .reduce((sum, t) => sum + toNumber(t.amount), 0);
  const plan = (plans.data ?? [])[0];
  const recent = (expenses.data ?? []).slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Approved budget" value={money(budget)} hint={monthLabel(month)} />
        <StatCard
          label="Spent"
          value={money(spent)}
          tone={usageTone(spent, budget)}
          hint={`${money(Math.max(0, budget - spent))} left`}
        />
        <StatCard label="Money received" value={money(received)} hint="Transfers from parent" />
        <StatCard
          label="Budget status"
          value={plan ? PLAN_STATUS_META[plan.status].label : "Not started"}
          tone={plan ? PLAN_STATUS_META[plan.status].tone : "neutral"}
          hint={plan ? `${plan.items?.length ?? 0} items` : "Create your monthly plan"}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/expenses/new">Log an expense</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/budget">{plan ? "Open my budget" : "Create my budget"}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/requests">Ask for extra money</Link>
        </Button>
      </div>

      <section className="card-surface p-4">
        <h2 className="font-display text-base font-semibold">Category limits</h2>
        {rollup.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No approved budget yet for {monthLabel(month)}. Submit a budget plan to get limits.
          </p>
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

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">Recent expenses</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/expenses">
              See all <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="card-surface divide-y">
          {recent.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No expenses logged this month.</p>
          ) : (
            recent.map((expense) => (
              <Link
                key={expense.id}
                to="/expenses/$expenseId"
                params={{ expenseId: expense.id }}
                className="flex items-center justify-between gap-3 p-4 hover:bg-muted/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{expense.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {expense.category?.name} · {dateLabel(expense.expense_date)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="money text-sm font-semibold">{money(expense.amount)}</span>
                  <StatusBadge {...EXPENSE_STATUS_META[expense.status]} />
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
