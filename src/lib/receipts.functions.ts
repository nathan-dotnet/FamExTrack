import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MAX_RECEIPT_BYTES, RECEIPT_MIME_TYPES } from "./domain";

const uploadSchema = z.object({
  filename: z.string().trim().min(1).max(200),
  mime: z.enum(RECEIPT_MIME_TYPES),
  base64: z
    .string()
    .min(16)
    .max(Math.ceil((MAX_RECEIPT_BYTES * 4) / 3) + 1024),
});

export type UploadedReceipt = {
  path: string;
  filename: string;
  mime: string;
  size: number;
};

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

/**
 * Uploads a receipt into the private bucket under the caller's own folder.
 * Type and size are validated on the server; the browser cannot bypass this.
 */
export const uploadReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => uploadSchema.parse(input))
  .handler(async ({ data, context }): Promise<UploadedReceipt> => {
    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength === 0) throw new Error("The receipt file is empty.");
    if (bytes.byteLength > MAX_RECEIPT_BYTES) {
      throw new Error("Receipt is too large. Maximum size is 8 MB.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `${context.userId}/${crypto.randomUUID()}-${safeName(data.filename)}`;
    const { error } = await supabaseAdmin.storage
      .from("receipts")
      .upload(path, bytes, { contentType: data.mime, upsert: false });
    if (error) throw new Error(error.message);

    return { path, filename: data.filename, mime: data.mime, size: bytes.byteLength };
  });

/**
 * Returns a short-lived signed URL, but only after the database confirms the
 * caller is allowed to see that expense (owner or linked parent).
 */
export const getReceiptUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ expenseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: expense, error } = await context.supabase
      .from("expenses")
      .select("id, receipt_path, receipt_filename, receipt_mime, receipt_uploaded_at")
      .eq("id", data.expenseId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!expense) throw new Error("Not authorized to view this receipt.");
    if (!expense.receipt_path) return { url: null as string | null, filename: null, mime: null };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const signed = await supabaseAdmin.storage
      .from("receipts")
      .createSignedUrl(expense.receipt_path, 300);
    if (signed.error) throw new Error(signed.error.message);

    return {
      url: signed.data.signedUrl,
      filename: expense.receipt_filename,
      mime: expense.receipt_mime,
      uploadedAt: expense.receipt_uploaded_at,
    };
  });
