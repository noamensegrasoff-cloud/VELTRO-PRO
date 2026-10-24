import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const siteUrl = Deno.env.get("SITE_URL");
const corsHeaders = {
  "Access-Control-Allow-Origin": siteUrl || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return respond({ error: "Server auth is not configured." }, 500);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return respond({ error: "Sign in required." }, 401);

  const callerClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData.user) return respond({ error: "Invalid or expired session." }, 401);
  const callerId = callerData.user.id;

  let body: { workspace_id?: string; user_id?: string; action?: string; role?: string };
  try { body = await req.json(); } catch { return respond({ error: "Invalid JSON body." }, 400); }
  const workspaceId = body.workspace_id?.trim();
  const targetId = body.user_id?.trim();
  const action = body.action;
  if (!workspaceId || !targetId || !["suspend", "activate", "set_role"].includes(action || "")) {
    return respond({ error: "Workspace, employee, and valid action are required." }, 400);
  }
  if (targetId === callerId) return respond({ error: "You cannot change your own access from this screen." }, 403);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: owner, error: ownerError } = await admin.from("workspace_members")
    .select("role").eq("workspace_id", workspaceId).eq("user_id", callerId).maybeSingle();
  if (ownerError) return respond({ error: "Could not verify workspace permissions." }, 500);
  if (owner?.role !== "owner") return respond({ error: "Only the workspace owner can manage employee access." }, 403);

  const { data: target, error: targetError } = await admin.from("workspace_members")
    .select("role,custom_role_id").eq("workspace_id", workspaceId).eq("user_id", targetId).maybeSingle();
  if (targetError) return respond({ error: "Could not find the workspace member." }, 500);
  if (!target) return respond({ error: "Employee is not a member of this workspace." }, 404);
  if (target.role === "owner") return respond({ error: "The owner account cannot be modified here." }, 403);

  if (action === "set_role") {
    const requestedRole = body.role?.trim();
    if (!requestedRole || requestedRole === "owner" || requestedRole === "admin") {
      return respond({ error: "Only non-owner employee roles can be assigned here." }, 400);
    }
    const allowed = ["manager", "cashier", "member", "viewer"];
    let role = requestedRole;
    let customRoleId: string | null = null;
    if (!allowed.includes(requestedRole)) {
      const { data: customRole, error: roleError } = await admin.from("workspace_roles")
        .select("id").eq("workspace_id", workspaceId).eq("id", requestedRole).maybeSingle();
      if (roleError) return respond({ error: "Could not verify the selected role." }, 500);
      if (!customRole) return respond({ error: "The selected role is invalid." }, 400);
      role = "member";
      customRoleId = customRole.id;
    }
    const { error: updateError } = await admin.from("workspace_members").update({
      role, custom_role_id: customRoleId,
    }).eq("workspace_id", workspaceId).eq("user_id", targetId);
    if (updateError) return respond({ error: "Could not update employee role." }, 500);
    await admin.from("workspace_audit_logs").insert({
      workspace_id: workspaceId, actor_user_id: callerId, action: "employee.role.update",
      entity_type: "employee", entity_id: targetId, details: { role, custom_role_id: customRoleId },
    });
    return respond({ ok: true });
  }

  const status = action === "suspend" ? "suspended" : "active";
  const { data: existingProfile, error: profileReadError } = await admin.from("employee_profiles")
    .select("workspace_id,user_id").eq("workspace_id", workspaceId).eq("user_id", targetId).maybeSingle();
  if (profileReadError) return respond({ error: "Could not load employee profile." }, 500);
  const profileWrite = existingProfile
    ? await admin.from("employee_profiles").update({ status, updated_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId).eq("user_id", targetId)
    : await admin.from("employee_profiles").insert({ workspace_id: workspaceId, user_id: targetId, status });
  if (profileWrite.error) return respond({ error: "Could not update employee status." }, 500);

  // Ban future sign-ins/token refreshes and mark tracked sessions revoked.
  const { error: authUpdateError } = await admin.auth.admin.updateUserById(targetId, {
    ban_duration: action === "suspend" ? "876000h" : "none",
  });
  if (authUpdateError) {
    return respond({ error: "Employee status was saved, but authentication access could not be changed: " + authUpdateError.message }, 500);
  }
  if (action === "suspend") {
    const { error: sessionError } = await admin.from("workspace_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId).eq("user_id", targetId).is("revoked_at", null);
    if (sessionError) return respond({ error: "Account was suspended, but tracked sessions could not all be revoked." }, 500);
  }
  await admin.from("workspace_audit_logs").insert({
    workspace_id: workspaceId, actor_user_id: callerId, action: "employee.status.update",
    entity_type: "employee", entity_id: targetId, details: { status },
  });
  return respond({ ok: true, status });
});
