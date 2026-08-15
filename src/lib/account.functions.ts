import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import type { AppRole } from "./domain";

export type AccountInfo = {
  userId: string;
  email: string;
  fullName: string;
  role: AppRole;
  parentId: string | null;
  linkStatus: string;
};

/**
 * Creates the profile + role row for the signed-in user on first login.
 * Role is derived from signup metadata, but "parent" is only granted when no
 * parent exists yet, so a son can never promote himself.
 */
export const ensureAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountInfo> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authError || !authUser.user) throw new Error("Account not found.");

    const email = authUser.user.email ?? "";
    const metadata = (authUser.user.user_metadata ?? {}) as Record<string, unknown>;
    const requestedRole = metadata["role"] === "parent" ? "parent" : "son";
    const fullName =
      typeof metadata["full_name"] === "string" && metadata["full_name"].trim().length > 0
        ? (metadata["full_name"] as string).trim()
        : (email.split("@")[0] ?? "Member");

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, parent_id, link_status")
      .eq("id", userId)
      .maybeSingle();

    if (!existingProfile) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .insert({ id: userId, full_name: fullName, email });
      if (error) throw new Error(error.message);
    } else if (existingProfile.email !== email) {
      await supabaseAdmin.from("profiles").update({ email }).eq("id", userId);
    }

    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    let role: AppRole = roleRow?.role ?? "son";
    if (!roleRow) {
      if (requestedRole === "parent") {
        const { count } = await supabaseAdmin
          .from("user_roles")
          .select("id", { count: "exact", head: true })
          .eq("role", "parent");
        role = (count ?? 0) === 0 ? "parent" : "son";
      } else {
        role = "son";
      }
      const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
      if (error) throw new Error(error.message);
    }

    // Auto-attach a new son to the single parent as a pending link request.
    if (role === "son") {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("parent_id, link_status")
        .eq("id", userId)
        .maybeSingle();
      if (profile && !profile.parent_id) {
        const { data: parentRole } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .eq("role", "parent")
          .limit(1)
          .maybeSingle();
        if (parentRole) {
          await supabaseAdmin
            .from("profiles")
            .update({ parent_id: parentRole.user_id, link_status: "pending" })
            .eq("id", userId);
        }
      }
    }

    const { data: finalProfile, error: finalError } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email, parent_id, link_status")
      .eq("id", userId)
      .single();
    if (finalError) throw new Error(finalError.message);

    return {
      userId,
      email: finalProfile.email,
      fullName: finalProfile.full_name,
      role,
      parentId: finalProfile.parent_id,
      linkStatus: finalProfile.link_status,
    };
  });

/** Parent-only: list every son account with its link state. */
export const listSons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isParent } = await context.supabase.rpc("is_parent");
    if (!isParent) throw new Error("Forbidden");

    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, full_name, email, parent_id, link_status, created_at")
      .neq("id", context.userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  });
