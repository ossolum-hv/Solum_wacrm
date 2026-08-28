// ============================================================
// /api/leads/[id]
//
//   GET   — Get single lead
//   PATCH — Update lead (status, assigned_to, notes)
//
// ============================================================

import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

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

type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";

const VALID_STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "converted", "lost"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if superadmin
    const admin = supabaseAdmin();
    const { data: isSuperadmin } = await admin
      .from("superadmins")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    const isSuper = !!isSuperadmin && isSuperadmin.length > 0;

    const { data: lead, error } = await (admin
      .from("leads") as any)
      .select("*")
      .eq("id", id)
      .single();

    if (error || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Non-superadmins can only view their assigned leads
    if (!isSuper && (lead as any).assigned_to_user_id && (lead as any).assigned_to_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error("[GET /api/leads/[id]] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { status, assigned_to_user_id, notes } = body;

    // Check if superadmin
    const admin = supabaseAdmin();
    const { data: isSuperadmin } = await admin
      .from("superadmins")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    const isSuper = !!isSuperadmin && isSuperadmin.length > 0;

    // Build update object
    const updates: Record<string, unknown> = {};

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: "Invalid status. Must be one of: " + VALID_STATUSES.join(", ") },
          { status: 400 },
        );
      }
      updates.status = status;
      if (status === "contacted") {
        updates.last_contacted_at = new Date().toISOString();
      }
      if (status === "converted") {
        updates.converted_at = new Date().toISOString();
      }
    }

    if (isSuper && assigned_to_user_id !== undefined) {
      updates.assigned_to_user_id = assigned_to_user_id || null;
    }

    if (isSuper && notes !== undefined) {
      updates.notes = notes;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data: lead, error } = await (admin
      .from("leads") as any)
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[PATCH /api/leads/[id]] error:", error);
      return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error("[PATCH /api/leads/[id]] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
