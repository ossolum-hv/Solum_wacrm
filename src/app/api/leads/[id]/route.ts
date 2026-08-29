// ============================================================
// /api/leads/[id]
//
//   PATCH — Update lead status (authenticated, admin+)
// ============================================================

import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { canManageLeads as canManageLeadsCheck } from "@/lib/auth/roles";

// Lazy-initialised service-role client
let _adminClient: ReturnType<typeof createAdminClient> | null = null;
function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _adminClient;
}

async function getAuthenticatedUser(request: Request) {
  // First try to get user from Authorization header (for client-side calls)
  let user = null;
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const admin = supabaseAdmin();
    const { data: { user: authUser } } = await admin.auth.getUser(token);
    user = authUser;
  }

  // Fallback to cookie-based auth (for SSR)
  if (!user) {
    const supabase = await createClient();
    const { data: { user: cookieUser } } = await supabase.auth.getUser();
    user = cookieUser;
  }

  return user;
}

async function getUserAccountRole(userId: string): Promise<{ accountId: string | null; accountRole: string | null }> {
  const admin = supabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("account_id, account_role")
    .eq("user_id", userId)
    .maybeSingle();

  // Type assertion for profile fields that exist in DB but not in generated types
  const accountId = (profile as { account_id: string | null } | null)?.account_id ?? null;
  const accountRole = (profile as { account_role: string | null } | null)?.account_role ?? null;

  return {
    accountId,
    accountRole,
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's account and role
    const { accountId, accountRole } = await getUserAccountRole(user.id);

    if (!accountId || !accountRole || !canManageLeadsCheck(accountRole as "owner" | "admin" | "agent" | "viewer")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const { status } = body as { status: string };

    if (!status) {
      return NextResponse.json({ error: "Missing status" }, { status: 400 });
    }

    const validStatuses = ["new", "contacted", "qualified", "converted", "lost"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // Verify the lead belongs to the user's account
    const { data: lead, error: leadError } = await admin
      .from("leads")
      .select("id, account_id")
      .eq("id", id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Type assertion for lead fields that exist in DB but not in generated types
    const leadAccountId = (lead as { account_id: string | null }).account_id;

    if (leadAccountId !== accountId) {
      return NextResponse.json({ error: "Forbidden: lead not in your account" }, { status: 403 });
    }

    // Update the lead status
    const { error: updateError } = await (admin
      .from("leads") as any)
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) {
      console.error("[PATCH /api/leads/[id]] error:", updateError);
      return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/leads/[id]] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}