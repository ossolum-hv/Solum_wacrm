import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { META_GRAPH_API_VERSION } from '@/lib/meta-graph'

export async function GET() {
  try {
    let accountId: string
    try {
      ({ accountId } = await requireRole('admin'))
    } catch (error) {
      return toErrorResponse(error)
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
        'instagram_manage_comments',
        'pages_show_list',
        'pages_manage_metadata',
        'pages_read_engagement',
      ].join(','),
      response_type: 'code',
      state,
    })

    return NextResponse.json({
      url: `https://www.facebook.com/${META_GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`,
    })
  } catch (error) {
    console.error('[instagram/oauth] Internal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
