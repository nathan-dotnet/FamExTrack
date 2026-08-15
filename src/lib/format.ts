export const CURRENCY_SYMBOL = "₱";

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Money is handled as strings/numeric on the server; format for display only. */
export function money(value: number | string | null | undefined): string {
  const n = toNumber(value);
  return `${CURRENCY_SYMBOL}${pesoFormatter.format(n)}`;
}

export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Round to 2 decimals to avoid float drift in display math. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function percent(spent: number, budget: number): number {
  if (budget <= 0) return spent > 0 ? 100 : 0;
  return Math.min(999, Math.round((spent / budget) * 100));
}

export function monthKey(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00`) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function monthLabel(value: string): string {
  const d = new Date(`${value.slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
}

export function recentMonths(count = 12): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    out.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i + 1, 1)));
  }
  return out;
}

export function dateLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export function dateTimeLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
