// ============================================================
// /api/leads
//
//   POST — Create a new lead (public)
//   GET  — List leads (authenticated, admin+ can see all leads in account)
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

interface LeadInput {
  full_name: string;
  email: string;
  phone: string;
  company_name: string;
  industry?: string;
  team_size?: string;
  message?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

function validateLead(input: unknown): input is LeadInput {
  if (!input || typeof input !== "object") return false;
  const obj = input as Record<string, unknown>;
  return (
    typeof obj.full_name === "string" && obj.full_name.trim().length > 0 &&
    typeof obj.email === "string" && obj.email.includes("@") &&
    typeof obj.phone === "string" && obj.phone.trim().length > 0 &&
    typeof obj.company_name === "string" && obj.company_name.trim().length > 0
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!validateLead(body)) {
      return NextResponse.json(
        { error: "Invalid input: full_name, email, phone, and company_name are required" },
        { status: 400 },
      );
    }

    const admin = supabaseAdmin();

    // Check for duplicate by email (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await admin
      .from("leads")
      .select("id")
      .eq("email", body.email)
      .gte("created_at", yesterday)
      .limit(1);

    if (existing && existing.length > 0) {
      // Don't reveal if lead exists - just say success
      return NextResponse.json({ success: true, duplicate: true });
    }

    // Insert lead
    const { data: lead, error } = await (admin
      .from("leads") as any)
      .insert({
        full_name: body.full_name.trim(),
        email: body.email.trim().toLowerCase(),
        phone: body.phone.trim(),
        company_name: body.company_name.trim(),
        industry: body.industry?.trim() || null,
        team_size: body.team_size?.trim() || null,
        message: body.message?.trim() || null,
        utm_source: body.utm_source?.trim() || null,
        utm_medium: body.utm_medium?.trim() || null,
        utm_campaign: body.utm_campaign?.trim() || null,
        source: "book-demo",
      })
      .select("id")
      .single();

    if (error) {
      console.error("[POST /api/leads] insert error:", error);
      return NextResponse.json(
        { error: "Failed to create lead" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, lead_id: (lead as { id: string }).id }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/leads] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
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

export async function GET(request: Request) {
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

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");
    const sort = url.searchParams.get("sort") || "created_at";
    const order = url.searchParams.get("order") || "desc";
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const admin = supabaseAdmin();

    // Admin+ users see all leads in their account
    let query = admin
      .from("leads")
      .select("*", { count: "exact" })
      .eq("account_id", accountId)
      .order(sort, { ascending: order === "asc" })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`);
    }

    const { data: leads, error, count } = await query;

    if (error) {
      console.error("[GET /api/leads] error:", error);
      return NextResponse.json(
        { error: "Failed to fetch leads" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      leads: leads ?? [],
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[GET /api/leads] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
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

    const body = await request.json().catch(() => null);
    const { id, status } = body as { id: string; status: string };

    if (!id || !status) {
      return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
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
      console.error("[PATCH /api/leads] error:", updateError);
      return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/leads] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}