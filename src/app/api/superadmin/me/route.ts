import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getUserFromRequest(request: Request) {
  // First try Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: { user } } = await admin.auth.getUser(token);
    return user;
  }
  
  // Fallback to cookie-based auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check if user is superadmin
    const { data: isSuperadmin } = await admin
      .from("superadmins")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    const isSuper = !!isSuperadmin && isSuperadmin.length > 0;

    // Also fetch profile for more context
    const { data: profile } = await admin
      .from("profiles")
      .select("id, full_name, email, account_id, account_role")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      user_id: user.id,
      email: user.email,
      is_superadmin: isSuper,
      profile: profile,
    });
  } catch (error) {
    console.error("[GET /api/superadmin/me] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}