import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_URL") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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

  let body: {
    workspace_id?: string;
    email?: string;
    full_name?: string;
    phone?: string;
    role?: string;
  };
  try { body = await req.json(); } catch { return respond({ error: "Invalid JSON body." }, 400); }

  const workspaceId = body.workspace_id?.trim();
  const email = body.email?.trim().toLowerCase();
  const fullName = body.full_name?.trim();
  const phone = body.phone?.trim() ?? "";
  const requestedRole = body.role?.trim() ?? "cashier";
  if (!workspaceId || !email || !fullName || !email.includes("@")) {
    return respond({ error: "Workspace, valid email, and full name are required." }, 400);
  }

  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: membership, error: membershipError } = await adminClient
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", callerId)
    .maybeSingle();
  if (membershipError) return respond({ error: "Could not verify workspace permissions." }, 500);
  if (membership?.role !== "owner") return respond({ error: "Only the workspace owner can invite employees." }, 403);

  let role = requestedRole;
  let customRoleId: string | null = null;
  const allowedRoles = ["manager", "cashier", "member", "viewer"];
  if (!allowedRoles.includes(requestedRole)) {
    const { data: customRole, error: customRoleError } = await adminClient
      .from("workspace_roles")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("id", requestedRole)
      .maybeSingle();
    if (customRoleError) return respond({ error: "Could not verify the selected role." }, 500);
    if (!customRole) return respond({ error: "The selected role is invalid." }, 400);
    role = "member";
    customRoleId = customRole.id;
  }

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, invited_workspace_id: workspaceId },
    redirectTo: Deno.env.get("SITE_URL") || undefined,
  });
  if (inviteError) return respond({ error: inviteError.message }, 400);
  const invitedUser = inviteData.user;
  if (!invitedUser) return respond({ error: "The invitation did not return a user." }, 500);

  const { error: memberInsertError } = await adminClient.from("workspace_members").upsert({
    workspace_id: workspaceId, user_id: invitedUser.id, role, custom_role_id: customRoleId,
  }, { onConflict: "workspace_id,user_id" });
  if (memberInsertError) {
    return respond({ error: "Invitation was created but workspace membership failed. Contact the owner before retrying.", user_id: invitedUser.id }, 500);
  }

  const { error: profileError } = await adminClient.from("employee_profiles").upsert({
    workspace_id: workspaceId, user_id: invitedUser.id, full_name: fullName, email, phone, status: "invited",
  }, { onConflict: "workspace_id,user_id" });
  if (profileError) return respond({ error: "Invitation was sent, but the employee profile could not be saved.", user_id: invitedUser.id }, 500);

  await adminClient.from("workspace_audit_logs").insert({
    workspace_id: workspaceId, actor_user_id: callerId, action: "employee.invite",
    entity_type: "employee", entity_id: invitedUser.id, details: { email, role, custom_role_id: customRoleId },
  });

  return respond({ ok: true, user_id: invitedUser.id, email });
});
