import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/** Guards: only accessible when no superadmin exists yet. */
async function requireNoSuperadmin(): Promise<boolean> {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data } = await admin.from('superadmins').select('id').limit(1)
  return !data || data.length === 0
}

export async function GET() {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const hasAny = await requireNoSuperadmin()
  return NextResponse.json({ exists: !hasAny })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, full_name } = body

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'email, password, and full_name are required' },
        { status: 400 },
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 },
      )
    }

    // Only allow bootstrap if no superadmin exists
    const hasAny = await requireNoSuperadmin()
    if (!hasAny) {
      return NextResponse.json(
        { error: 'A superadmin already exists. Use /api/superadmin/users to create new users.' },
        { status: 403 },
      )
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Create auth user
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (authError || !authUser.user) {
      console.error('[superadmin/bootstrap] Auth error:', authError)
      return NextResponse.json(
        { error: authError?.message ?? 'Failed to create user' },
        { status: 400 },
      )
    }

    const userId = authUser.user.id

    // Create superadmin row
    const { error: superadminError } = await admin.from('superadmins').insert({
      user_id: userId,
    })

    if (superadminError) {
      console.error('[superadmin/bootstrap] Superadmin insert error:', superadminError)
      // Attempt to clean up the auth user
      await admin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: 'Failed to create superadmin record' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Superadmin created successfully',
      user_id: userId,
    })
  } catch (error) {
    console.error('[superadmin/bootstrap] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
