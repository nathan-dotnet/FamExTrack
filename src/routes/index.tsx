import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Receipt, ShieldCheck, Wallet } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Family Ledger — Budgets, expenses and receipts" },
      {
        name: "description",
        content:
          "Manage your sons' monthly budgets, expenses, receipts and spending limits with parent approvals and a full audit trail.",
      },
      { property: "og:title", content: "Family Ledger — Budgets, expenses and receipts" },
      {
        property: "og:description",
        content: "Budget requests, receipt-backed expenses and parent approvals in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <p className="font-display text-base font-semibold">Family Ledger</p>
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-20">
        <section className="py-14">
          <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
            Every peso your sons spend, accounted for.
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Sons submit monthly budgets and log expenses with receipts. You approve limits, review
            overspending, and see exactly where the money went — in Philippine peso.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: <Wallet className="size-5" />,
              title: "Budget requests",
              body: "Category limits are proposed, reviewed and approved — line by line.",
            },
            {
              icon: <Receipt className="size-5" />,
              title: "Receipt-backed expenses",
              body: "No receipt means no silent approval: a reason is required every time.",
            },
            {
              icon: <ShieldCheck className="size-5" />,
              title: "Rules enforced server-side",
              body: "Overspending is flagged and held for your decision, with a full audit trail.",
            },
          ].map((card) => (
            <article key={card.title} className="card-surface p-5">
              <span className="text-primary">{card.icon}</span>
              <h2 className="mt-3 font-display text-base font-semibold">{card.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{card.body}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
