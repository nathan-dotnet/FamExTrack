import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";
import { COUNTED_EXPENSE_STATUSES } from "./domain";
import { round2, toNumber } from "./format";

export type CategoryRow = { id: string; name: string; sort_order: number; is_active: boolean };

export function categoriesQuery() {
  return queryOptions({
    queryKey: ["categories"],
    queryFn: async (): Promise<CategoryRow[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, sort_order, is_active")
        .order("sort_order");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 300_000,
  });
}

export function plansQuery(sonId?: string, month?: string) {
  return queryOptions({
    queryKey: ["plans", sonId ?? "all", month ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("budget_plans")
        .select(
          "id, son_id, month, status, parent_note, submitted_at, reviewed_at, created_at, son:profiles!budget_plans_son_id_fkey(full_name, email), items:budget_items(id, category_id, description, requested_amount, approved_amount, status, parent_note, category:categories(name))",
        )
        .order("month", { ascending: false });
      if (sonId) q = q.eq("son_id", sonId);
      if (month) q = q.eq("month", month);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function expensesQuery(filters?: { sonId?: string; month?: string }) {
  return queryOptions({
    queryKey: ["expenses", filters?.sonId ?? "all", filters?.month ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("expenses")
        .select(
          "id, son_id, category_id, amount, expense_date, month, description, receipt_path, receipt_filename, no_receipt_reason, overspend_reason, budget_at_submit, over_amount, status, review_note, reviewed_at, submission_count, created_at, category:categories(name), son:profiles!expenses_son_id_fkey(full_name, email)",
        )
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (filters?.sonId) q = q.eq("son_id", filters.sonId);
      if (filters?.month) q = q.eq("month", filters.month);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function expenseQuery(id: string) {
  return queryOptions({
    queryKey: ["expense", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select(
          "id, son_id, category_id, amount, expense_date, month, description, receipt_path, receipt_filename, no_receipt_reason, overspend_reason, budget_at_submit, over_amount, status, review_note, reviewed_at, submission_count, created_at, category:categories(name), son:profiles!expenses_son_id_fkey(full_name, email)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function expenseRevisionsQuery(expenseId: string) {
  return queryOptions({
    queryKey: ["expense-revisions", expenseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_revisions")
        .select("id, snapshot, created_at, note")
        .eq("expense_id", expenseId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function transfersQuery(sonId?: string) {
  return queryOptions({
    queryKey: ["transfers", sonId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("money_transfers")
        .select(
          "id, son_id, amount, transfer_date, month, method, reference, notes, created_at, son:profiles!money_transfers_son_id_fkey(full_name)",
        )
        .order("transfer_date", { ascending: false });
      if (sonId) q = q.eq("son_id", sonId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function requestsQuery(sonId?: string) {
  return queryOptions({
    queryKey: ["requests", sonId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("additional_money_requests")
        .select(
          "id, son_id, category_id, month, requested_amount, approved_amount, reason, status, parent_note, created_at, category:categories(name), son:profiles!additional_money_requests_son_id_fkey(full_name)",
        )
        .order("created_at", { ascending: false });
      if (sonId) q = q.eq("son_id", sonId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function notificationsQuery() {
  return queryOptions({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, message, kind, is_read, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function auditQuery(subjectId?: string) {
  return queryOptions({
    queryKey: ["audit", subjectId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("audit_logs")
        .select("id, actor_name, action, entity, amount, details, created_at, subject_id")
        .order("created_at", { ascending: false })
        .limit(200);
      if (subjectId) q = q.eq("subject_id", subjectId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export type PlanRow = Awaited<ReturnType<NonNullable<ReturnType<typeof plansQuery>["queryFn"]>>>[number];
export type ExpenseRow = Awaited<
  ReturnType<NonNullable<ReturnType<typeof expensesQuery>["queryFn"]>>
>[number];
export type TransferRow = Awaited<
  ReturnType<NonNullable<ReturnType<typeof transfersQuery>["queryFn"]>>
>[number];
export type RequestRow = Awaited<
  ReturnType<NonNullable<ReturnType<typeof requestsQuery>["queryFn"]>>
>[number];

export type CategoryRollup = {
  categoryId: string;
  name: string;
  budget: number;
  spent: number;
};

/**
 * Mirrors the database budget math for display: approved budget items plus
 * approved extra money, against expenses that currently count as spending.
 */
export function buildRollup(
  plans: PlanRow[],
  requests: RequestRow[],
  expenses: ExpenseRow[],
  month: string,
  categories: CategoryRow[],
): CategoryRollup[] {
  const map = new Map<string, CategoryRollup>();
  const nameOf = (id: string) => categories.find((c) => c.id === id)?.name ?? "Category";
  const ensure = (id: string) => {
    if (!map.has(id)) map.set(id, { categoryId: id, name: nameOf(id), budget: 0, spent: 0 });
    return map.get(id)!;
  };

  for (const plan of plans) {
    if (plan.month !== month) continue;
    if (plan.status !== "approved" && plan.status !== "partially_approved") continue;
    for (const item of plan.items ?? []) {
      if (item.status === "rejected") continue;
      ensure(item.category_id).budget += toNumber(item.approved_amount);
    }
  }
  for (const req of requests) {
    if (req.month !== month) continue;
    if (req.status !== "approved" && req.status !== "partially_approved") continue;
    ensure(req.category_id).budget += toNumber(req.approved_amount);
  }
  for (const exp of expenses) {
    if (exp.month !== month) continue;
    if (!COUNTED_EXPENSE_STATUSES.includes(exp.status)) continue;
    ensure(exp.category_id).spent += toNumber(exp.amount);
  }

  return [...map.values()]
    .map((row) => ({ ...row, budget: round2(row.budget), spent: round2(row.spent) }))
    .sort((a, b) => b.budget - a.budget || a.name.localeCompare(b.name));
}

export type SonProfile = {
  id: string;
  full_name: string;
  email: string;
  link_status: string;
  parent_id: string | null;
};

/** Profiles the signed-in user is allowed to see (RLS decides), minus self. */
export function sonsQuery(selfId: string | undefined) {
  return queryOptions({
    queryKey: ["sons", selfId ?? "anon"],
    queryFn: async (): Promise<SonProfile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, link_status, parent_id")
        .order("full_name");
      if (error) throw new Error(error.message);
      return (data ?? []).filter((row) => row.id !== selfId);
    },
    enabled: Boolean(selfId),
  });
}
