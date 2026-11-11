import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requireRole, UnauthorizedError } from '@/lib/auth/account'
import { encrypt } from '@/lib/whatsapp/encryption'
import { META_GRAPH_API_BASE } from '@/lib/meta-graph'
import { subscribeInstagramPageWebhooks } from '@/lib/instagram/meta-api'

function supabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    const cookieStore = await cookies()
    const storedState = cookieStore.get('instagram_oauth_state')?.value
    cookieStore.delete('instagram_oauth_state')

    if (error || !code || !state || !storedState || storedState !== state) {
      const reason = errorDescription ?? error ?? 'instagram_oauth_failed'
      return NextResponse.redirect(
        new URL(`/settings?tab=instagram&oauth=${encodeURIComponent(reason)}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      )
    }

    const [, accountId] = storedState.split(':')
    let accountContext: Awaited<ReturnType<typeof requireRole>> | null = null
    try {
      accountContext = await requireRole('admin')
    } catch (authError) {
      if (authError instanceof UnauthorizedError) {
        return NextResponse.redirect(
          new URL('/login?next=/settings?tab=instagram', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
        )
      }
      return NextResponse.redirect(
        new URL(`/settings?tab=instagram&oauth=${encodeURIComponent('insufficient_role')}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      )
    }
    if (!accountId || !accountContext || accountContext.accountId !== accountId) {
      return NextResponse.redirect(
        new URL(`/settings?tab=instagram&oauth=${encodeURIComponent('account_changed_during_oauth')}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      )
    }

    const appId = process.env.META_APP_ID
    const appSecret = process.env.META_APP_SECRET
    const redirectUri = new URL('/api/instagram/oauth/callback', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').toString()

    if (!appId || !appSecret) {
      return NextResponse.redirect(
        new URL(`/settings?tab=instagram&oauth=${encodeURIComponent('missing_meta_env')}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      )
    }

    const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN
    if (!verifyToken) {
      return NextResponse.redirect(
        new URL(`/settings?tab=instagram&oauth=${encodeURIComponent('missing_instagram_webhook_verify_token')}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      )
    }

    const tokenResponse = await fetch(
      `${META_GRAPH_API_BASE}/oauth/access_token?client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${encodeURIComponent(code)}`,
      { method: 'GET' }
    )

    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('[instagram/oauth/callback] token exchange failed:', tokenData)
      return NextResponse.redirect(
        new URL(`/settings?tab=instagram&oauth=${encodeURIComponent(tokenData.error?.message ?? 'token_exchange_failed')}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      )
    }

    const pagesResponse = await fetch(
      `${META_GRAPH_API_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${encodeURIComponent(tokenData.access_token)}`,
      { method: 'GET' }
    )
    const pagesData = await pagesResponse.json() as {
      data?: Array<{
        id?: string
        access_token?: string
        instagram_business_account?: { id?: string; username?: string }
      }>
      error?: { message?: string }
    }
    const linkedPages = (pagesData.data ?? []).filter(
      (candidate): candidate is {
        id: string
        access_token: string
        instagram_business_account: { id: string; username?: string; name?: string }
      } => Boolean(candidate.id && candidate.access_token && candidate.instagram_business_account?.id)
    )
    if (!pagesResponse.ok || linkedPages.length === 0) {
      console.error(
        '[instagram/oauth/callback] page lookup failed:',
        pagesData.error?.message ?? `Eligible Instagram Pages returned: ${linkedPages.length}`
      )
      return NextResponse.redirect(
        new URL(`/settings?tab=instagram&oauth=${encodeURIComponent(pagesData.error?.message ?? 'page_lookup_failed')}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      )
    }

    if (linkedPages.length > 1) {
      return NextResponse.redirect(
        new URL(`/settings?tab=instagram&oauth=${encodeURIComponent('multiple_instagram_pages')}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      )
    }

    const page = linkedPages[0]
    const pageAccessToken = page.access_token
    const igBusiness = page.instagram_business_account
    const pageId = page.id

    let webhookSubscribed = false
    try {
      await subscribeInstagramPageWebhooks({ pageId, accessToken: pageAccessToken })
      webhookSubscribed = true
    } catch (subscriptionError) {
      console.error('[instagram/oauth/callback] Webhook subscription failed:', subscriptionError)
    }
    const admin = supabaseAdmin()
    const { data: existing, error: existingError } = await admin
      .from('instagram_config')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle()

    if (existingError) {
      console.error('[instagram/oauth/callback] Existing lookup failed:', existingError)
      return NextResponse.redirect(
        new URL(`/settings?tab=instagram&oauth=${encodeURIComponent('db_lookup_failed')}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      )
    }

    const payload = {
      account_id: accountId,
      user_id: accountContext.userId,
      ig_business_id: igBusiness.id,
      ig_username: igBusiness.username || igBusiness.name || 'instagram-account',
      page_id: pageId,
      page_access_token: encrypt(pageAccessToken),
      verify_token: encrypt(verifyToken),
      status: 'connected',
      webhook_subscribed: webhookSubscribed,
      connected_at: existing?.connected_at ?? new Date().toISOString(),
    }

    let result
    if (existing?.id) {
      result = await admin.from('instagram_config').update(payload).eq('id', existing.id).select('*').single()
    } else {
      result = await admin.from('instagram_config').insert(payload).select('*').single()
    }

    if (result.error) {
      console.error('[instagram/oauth/callback] Save failed:', result.error)
      return NextResponse.redirect(
        new URL(`/settings?tab=instagram&oauth=${encodeURIComponent(result.error.message)}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      )
    }

    return NextResponse.redirect(new URL('/settings?tab=instagram&status=connected', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
  } catch (error) {
    console.error('[instagram/oauth/callback] Internal error:', error)
    return NextResponse.redirect(
      new URL('/settings?tab=instagram&oauth=internal_error', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
    )
  }
}
