import { usageTone } from "@/lib/domain";
import { money, percent } from "@/lib/format";
import { cn } from "@/lib/utils";

export function BudgetBar({
    label,
    spent,
    budget,
    compact = false,
    }: {
    label: string;
    spent: number;
    budget: number;
    compact?: boolean;
    }) {
    const tone = usageTone(spent, budget);
    const pct = percent(spent, budget);
    const over = spent - budget;

    return (
        <div className={cn("space-y-1.5", compact ? "py-1.5" : "py-2")}>
        <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">{label}</span>
            <span className="money text-sm text-muted-foreground">
            <span
                className={cn(
                "font-semibold",
                tone === "over" ? "text-over" : tone === "warn" ? "text-warn-foreground" : "text-foreground",
                )}
            >
                {money(spent)}
            </span>{" "}
            / {money(budget)}
            </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
            className={cn(
                "h-full rounded-full transition-all",
                tone === "over" ? "bg-over" : tone === "warn" ? "bg-warn" : "bg-ok",
            )}
            style={{ width: `${Math.min(100, pct)}%` }}
            />
        </div>
        {!compact && (
            <p
            className={cn(
                "text-xs",
                tone === "over" ? "text-over" : tone === "warn" ? "text-warn-foreground" : "text-muted-foreground",
            )}
            >
            {tone === "over"
                ? `Over by ${money(over)} — a reason is required for new expenses.`
                : tone === "warn"
                ? `${pct}% used — close to the limit.`
                : `${pct}% used · ${money(Math.max(0, budget - spent))} remaining`}
            </p>
        )}
        </div>
    );
}
