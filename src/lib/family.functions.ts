import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const linkSchema = z.object({
  sonId: z.string().uuid(),
  action: z.enum(["link", "unlink"]),
});

/** Parent-only: approve (link) or revoke a son's account link. */
export const setSonLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => linkSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isParent } = await context.supabase.rpc("is_parent");
    if (!isParent) throw new Error("Forbidden");

    const { error } = await context.supabase
      .from("profiles")
      .update(
        data.action === "link"
          ? { parent_id: context.userId, link_status: "linked" }
          : { link_status: "pending" },
      )
      .eq("id", data.sonId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
