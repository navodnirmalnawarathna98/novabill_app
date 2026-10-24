import { createServerFn } from "@tanstack/react-start";

// Idempotent: creates the admin account from server-side secrets
// (ADMIN_EMAIL / ADMIN_PASSWORD) and grants the admin role. No input accepted.
export const ensureAdminAccount = createServerFn({ method: "POST" }).handler(async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Admin secrets not configured");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) throw new Error(listErr.message);
  let user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    user = data.user!;
  }
  const { error: roleErr } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
  if (roleErr) throw new Error(roleErr.message);
  return { ok: true };
});
