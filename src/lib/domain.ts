import type { Database } from "@/integrations/supabase/types";

export type ExpenseStatus = Database["public"]["Enums"]["expense_status"];
export type PlanStatus = Database["public"]["Enums"]["plan_status"];
export type ItemStatus = Database["public"]["Enums"]["item_status"];
export type RequestStatus = Database["public"]["Enums"]["request_status"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export type Tone = "ok" | "warn" | "over" | "neutral";

export const EXPENSE_STATUS_META: Record<ExpenseStatus, { label: string; tone: Tone }> = {
  pending_review: { label: "Pending review", tone: "neutral" },
  approved: { label: "Approved", tone: "ok" },
  rejected: { label: "Rejected", tone: "over" },
  pending_exception: { label: "Exception pending", tone: "warn" },
  exception_approved: { label: "Exception approved", tone: "ok" },
  exception_rejected: { label: "Exception rejected", tone: "over" },
};

export const PLAN_STATUS_META: Record<PlanStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  submitted: { label: "Submitted", tone: "neutral" },
  under_review: { label: "Under review", tone: "warn" },
  approved: { label: "Approved", tone: "ok" },
  partially_approved: { label: "Partially approved", tone: "ok" },
  rejected: { label: "Rejected", tone: "over" },
};

export const ITEM_STATUS_META: Record<ItemStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "neutral" },
  approved: { label: "Approved", tone: "ok" },
  reduced: { label: "Reduced", tone: "warn" },
  rejected: { label: "Rejected", tone: "over" },
};

export const REQUEST_STATUS_META: Record<RequestStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "neutral" },
  approved: { label: "Approved", tone: "ok" },
  partially_approved: { label: "Partially approved", tone: "ok" },
  rejected: { label: "Rejected", tone: "over" },
};

export const PENDING_EXPENSE_STATUSES: ExpenseStatus[] = ["pending_review", "pending_exception"];

/** Statuses that consume budget (money actually left the wallet). */
export const COUNTED_EXPENSE_STATUSES: ExpenseStatus[] = [
  "pending_review",
  "approved",
  "pending_exception",
  "exception_approved",
];

export const TRANSFER_METHODS = ["Cash", "Bank Transfer", "GCash", "Other"] as const;

export const RECEIPT_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;

export function usageTone(spent: number, budget: number): Tone {
  if (budget <= 0) return spent > 0 ? "over" : "neutral";
  const ratio = spent / budget;
  if (ratio > 1) return "over";
  if (ratio >= 0.9) return "warn";
  return "ok";
}
