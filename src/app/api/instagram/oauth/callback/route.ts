import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/whatsapp/encryption'

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
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.redirect(
        new URL('/login?next=/settings?tab=instagram', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
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

    const tokenResponse = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${encodeURIComponent(code)}`,
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
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(tokenData.access_token)}`,
      { method: 'GET' }
    )
    const pagesData = await pagesResponse.json()
    if (!pagesResponse.ok || !pagesData.data?.[0]) {
      console.error('[instagram/oauth/callback] page lookup failed:', pagesData)
      return NextResponse.redirect(
        new URL(`/settings?tab=instagram&oauth=${encodeURIComponent(pagesData.error?.message ?? 'page_lookup_failed')}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      )
    }

    const page = pagesData.data[0]
    const pageAccessToken = page.access_token
    const pageInfoResponse = await fetch(
      `https://graph.facebook.com/v21.0/${page.id}?fields=id,name,instagram_business_account{id,username}&access_token=${encodeURIComponent(pageAccessToken)}`,
      { method: 'GET' }
    )
    const pageInfoData = await pageInfoResponse.json()
    const igBusiness = pageInfoData.instagram_business_account

    if (!igBusiness || !igBusiness.id) {
      console.error('[instagram/oauth/callback] IG business lookup failed:', pageInfoData)
      return NextResponse.redirect(
        new URL(`/settings?tab=instagram&oauth=${encodeURIComponent(pageInfoData.error?.message ?? 'ig_lookup_failed')}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      )
    }

    const verifyToken = crypto.randomBytes(24).toString('hex')
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
      user_id: user.id,
      ig_business_id: igBusiness.id,
      ig_username: igBusiness.username || igBusiness.name || 'instagram-account',
      page_id: page.id,
      page_access_token: encrypt(pageAccessToken),
      verify_token: encrypt(verifyToken),
      status: 'connected',
      webhook_subscribed: true,
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
