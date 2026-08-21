import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

async function resolveAccountId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data?.account_id) return null
  return data.account_id as string
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) {
      return NextResponse.json({ error: 'Your profile is not linked to an account.' }, { status: 403 })
    }

    const appId = process.env.META_APP_ID
    if (!appId) {
      return NextResponse.json(
        { error: 'META_APP_ID is not configured. Add it to your environment before starting OAuth.' },
        { status: 400 }
      )
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const callbackUrl = new URL('/api/instagram/oauth/callback', siteUrl).toString()
    const state = `${crypto.randomBytes(16).toString('hex')}:${accountId}`

    const cookieStore = await cookies()
    cookieStore.set('instagram_oauth_state', state, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 10,
    })

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: callbackUrl,
      scope: [
        'instagram_basic',
        'instagram_manage_insights',
        'instagram_manage_messages',
        'pages_show_list',
        'pages_manage_metadata',
        'pages_read_engagement',
        'pages_manage_posts',
      ].join(','),
      response_type: 'code',
      state,
    })

    return NextResponse.json({
      url: `https://www.facebook.com/dialog/oauth?${params.toString()}`,
    })
  } catch (error) {
    console.error('[instagram/oauth] Internal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
