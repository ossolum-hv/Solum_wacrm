// ============================================================
// /api/leads
//
//   POST — Create a new lead (public)
//   GET  — List leads (authenticated, user can see their assigned leads)
//
// ============================================================

import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

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

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is superadmin
    const admin = supabaseAdmin();
    const { data: isSuperadmin } = await admin
      .from("superadmins")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    const isSuper = !!isSuperadmin && isSuperadmin.length > 0;

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    let query = admin
      .from("leads")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    // Non-superadmins only see their assigned or unassigned leads
    if (!isSuper) {
      query = query.or(`assigned_to_user_id.eq.${user.id},assigned_to_user_id.is.null`);
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