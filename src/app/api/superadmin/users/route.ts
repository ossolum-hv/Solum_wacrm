// ============================================================
// /api/superadmin/users
//
//   GET  — list all users across all accounts (superadmin only)
//   POST — create a new user with account + send invitation link
//
// ============================================================

import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  generateInviteToken,
  inviteExpiresAt,
  inviteUrl,
} from "@/lib/auth/invitations";
import { isAccountRole, type AccountRole } from "@/lib/auth/roles";

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

/** Check if the current user is a superadmin */
async function requireSuperadmin(userId: string): Promise<boolean> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("superadmins")
    .select("id")
    .eq("user_id", userId)
    .limit(1);
  return !!data && data.length > 0;
}

/** Derive the base URL for invite links */
function getBaseUrl(request: Request): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  if (forwardedHost) {
    return `${forwardedProto || "https"}://${forwardedHost}`;
  }

  const host = request.headers.get("host")?.trim();
  if (host) {
    const reqProto = new URL(request.url).protocol.replace(":", "");
    return `${reqProto}://${host}`;
  }

  return "https://wacrm.tech";
}

// ============================================================
// GET — list all users
// ============================================================
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const admin = supabaseAdmin();

    const { data: userData } = await admin.auth.getUser(token);
    const currentUser = userData?.user;
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuper = await requireSuperadmin(currentUser.id);
    if (!isSuper) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await (admin
      .from("profiles") as any)
      .select("id, user_id, full_name, email, account_id, account_role, created_at")
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.error("[GET /api/superadmin/users] profiles error:", profilesError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 },
      );
    }

    // Fetch accounts for profile account_ids
    const accountIds = [...new Set((profiles ?? []).map((p: any) => p.account_id).filter(Boolean))] as string[];
    const { data: accounts } = accountIds.length > 0
      ? await (admin.from("accounts") as any).select("id, name").in("id", accountIds)
      : { data: [] };

    const accountMap = new Map((accounts ?? []).map((a: any) => [a.id, a.name]));

    // Also fetch superadmins list
    const { data: superadmins } = await (admin
      .from("superadmins") as any)
      .select("user_id")
      .order("created_at", { ascending: false });

    const superadminIds = new Set(
      (superadmins ?? []).map((s: any) => s.user_id),
    );

    // Fetch pending invitations
    const { data: invitations } = await (admin
      .from("account_invitations") as any)
      .select("id, email, role, label, created_at, expires_at, account_id")
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    const users = (profiles ?? []).map((p: any) => ({
      id: p.user_id,
      profile_id: p.id,
      full_name: p.full_name,
      email: p.email,
      account_id: p.account_id,
      account_name: p.account_id ? accountMap.get(p.account_id) ?? null : null,
      account_role: p.account_role,
      is_superadmin: superadminIds.has(p.user_id),
      created_at: p.created_at,
    }));

    return NextResponse.json({
      users,
      invitations: invitations ?? [],
    });
  } catch (error) {
    console.error("[GET /api/superadmin/users] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================
// POST — create a new user
// ============================================================
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const admin = supabaseAdmin();

    const { data: userData } = await admin.auth.getUser(token);
    const currentUser = userData?.user;
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuper = await requireSuperadmin(currentUser.id);
    if (!isSuper) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { email, full_name, account_name, role } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "email is required" },
        { status: 400 },
      );
    }
    if (!full_name || typeof full_name !== "string") {
      return NextResponse.json(
        { error: "full_name is required" },
        { status: 400 },
      );
    }
    if (!account_name || typeof account_name !== "string") {
      return NextResponse.json(
        { error: "account_name is required" },
        { status: 400 },
      );
    }
    if (!isAccountRole(role) || role === "owner") {
      return NextResponse.json(
        { error: "role must be one of admin, agent, viewer" },
        { status: 400 },
      );
    }

    // Generate a temporary password for the new user
    const tempPassword = generateTempPassword();

    // Step 1: Create auth user
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false, // User must verify email
      user_metadata: { full_name },
    });

    if (authError || !authUser.user) {
      console.error("[POST /api/superadmin/users] auth error:", authError);
      return NextResponse.json(
        { error: authError?.message ?? "Failed to create user" },
        { status: 400 },
      );
    }

    const newUserId = authUser.user.id;

    // Step 2: Create account
    const { data: account, error: accountError } = await (admin
      .from("accounts") as any)
      .insert({ name: account_name, owner_user_id: newUserId })
      .select("id, name")
      .single();

    if (accountError || !account) {
      console.error("[POST /api/superadmin/users] account error:", accountError);
      // Attempt to clean up auth user
      await admin.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 },
      );
    }

    const accountId = (account as { id: string }).id;

    // Step 3: Update profile (created by trigger) with account info
    const { error: profileError } = await (admin
      .from("profiles") as any)
      .update({
        account_id: accountId,
        account_role: role as AccountRole,
        full_name,
      })
      .eq("user_id", newUserId);

    if (profileError) {
      console.error("[POST /api/superadmin/users] profile update error:", profileError);
      // Attempt to clean up
      await (admin.from("accounts") as any).delete().eq("id", accountId);
      await admin.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        { error: "Failed to link user to account" },
        { status: 500 },
      );
    }

    // Step 4: Create invitation record (for the join flow)
    const { token: inviteToken, hash: tokenHash } = generateInviteToken();
    const expiresAt = inviteExpiresAt(7); // 7 days default

    const { error: inviteError } = await (admin
      .from("account_invitations") as any)
      .insert({
        email,
        account_id: accountId,
        token_hash: tokenHash,
        role: role as AccountRole,
        created_by_user_id: currentUser.id,
        expires_at: expiresAt.toISOString(),
      });

    if (inviteError) {
      console.error("[POST /api/superadmin/users] invite error:", inviteError);
      // Not fatal — user was created, just no invite record
    }

    const baseUrl = getBaseUrl(request);
    const inviteUrlLink = inviteUrl(inviteToken, baseUrl);

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUserId,
          email,
          full_name,
          account_id: accountId,
          account_name,
          role,
        },
        credentials: {
          email,
          temporary_password: tempPassword,
          // Note: User must verify email before they can sign in
          // Share this via a secure channel
        },
        invitation: {
          url: inviteUrlLink,
          expires_at: expiresAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/superadmin/users] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/** Generate a secure random password for new users */
function generateTempPassword(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  const randomBytes = require("node:crypto").randomBytes(16);
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
}