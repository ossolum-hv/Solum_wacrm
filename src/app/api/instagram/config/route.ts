import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { decrypt, encrypt } from '@/lib/whatsapp/encryption'
import { verifyInstagramPageToken } from '@/lib/instagram/meta-api'

let _adminClient: any = null
function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _adminClient
}

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

function requireString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
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
      return NextResponse.json(
        {
          connected: false,
          reason: 'no_account',
          message: 'Your profile is not linked to an account.',
        },
        { status: 200 }
      )
    }

    const { data: config, error: configError } = await supabase
      .from('instagram_config')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle()

    if (configError) {
      console.error('[instagram/config GET] Query failed:', configError)
      return NextResponse.json(
        { connected: false, reason: 'db_error', message: 'Failed to fetch Instagram configuration.' },
        { status: 200 }
      )
    }

    if (!config) {
      return NextResponse.json(
        {
          connected: false,
          reason: 'no_config',
          message: 'No Instagram configuration saved yet.',
        },
        { status: 200 }
      )
    }

    try {
      const token = decrypt(config.page_access_token)
      await verifyInstagramPageToken({
        pageId: config.page_id,
        igBusinessId: config.ig_business_id,
        accessToken: token,
      })
      return NextResponse.json({ connected: true, config })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Meta API error'
      console.error('[instagram/config GET] Meta validation failed:', message)
      return NextResponse.json(
        {
          connected: false,
          reason: 'meta_api_error',
          message: `Meta rejected the Instagram credentials: ${message}`,
        },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('[instagram/config GET] Internal error:', error)
    return NextResponse.json(
      { connected: false, reason: 'unknown', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
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
      return NextResponse.json(
        { error: 'Your profile is not linked to an account.' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const igBusinessId = requireString(body.ig_business_id)
    const igUsername = requireString(body.ig_username)
    const pageId = requireString(body.page_id)
    const pageAccessToken = requireString(body.page_access_token)
    const verifyToken = requireString(body.verify_token)
    const webhookSubscribed = body.webhook_subscribed === undefined ? true : Boolean(body.webhook_subscribed)

    if (!igBusinessId || !igUsername || !pageId) {
      return NextResponse.json(
        { error: 'ig_business_id, ig_username, and page_id are required.' },
        { status: 400 }
      )
    }

    let currentConfig: any = null
    const { data: existing, error: existingError } = await supabase
      .from('instagram_config')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle()

    if (existingError) {
      console.error('[instagram/config POST] Existing lookup failed:', existingError)
      return NextResponse.json({ error: 'Failed to load current Instagram config.' }, { status: 500 })
    }
    currentConfig = existing

    if (!pageAccessToken && !currentConfig) {
      return NextResponse.json(
        { error: 'page_access_token is required for a new configuration.' },
        { status: 400 }
      )
    }

    const tokenToValidate = pageAccessToken ?? (currentConfig ? decrypt(currentConfig.page_access_token) : null)
    if (!tokenToValidate) {
      return NextResponse.json(
        { error: 'page_access_token is required for a new configuration.' },
        { status: 400 }
      )
    }

    if (!verifyToken && !currentConfig?.verify_token) {
      return NextResponse.json(
        { error: 'verify_token is required for a new configuration.' },
        { status: 400 }
      )
    }

    try {
      await verifyInstagramPageToken({
        pageId,
        igBusinessId,
        accessToken: tokenToValidate,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Meta API error'
      return NextResponse.json(
        { error: `Meta rejected the Instagram page token: ${message}` },
        { status: 400 }
      )
    }

    const { data: claimed, error: claimedError } = await supabaseAdmin()
      .from('instagram_config')
      .select('account_id')
      .eq('ig_business_id', igBusinessId)
      .neq('account_id', accountId)
      .maybeSingle()

    if (claimedError) {
      console.error('[instagram/config POST] Claim check failed:', claimedError)
      return NextResponse.json({ error: 'Failed to validate Instagram account ownership.' }, { status: 500 })
    }

    if (claimed) {
      return NextResponse.json(
        {
          error: 'This Instagram Business account is already linked to another account on this instance.',
        },
        { status: 409 }
      )
    }

    const encryptedToken = encrypt(tokenToValidate)
    const encryptedVerifyToken = verifyToken ? encrypt(verifyToken) : currentConfig?.verify_token ?? encrypt('')
    const payload = {
      account_id: accountId,
      user_id: user.id,
      ig_business_id: igBusinessId,
      ig_username: igUsername,
      page_id: pageId,
      page_access_token: encryptedToken,
      verify_token: encryptedVerifyToken,
      status: 'connected' as const,
      webhook_subscribed: webhookSubscribed,
      connected_at: currentConfig?.connected_at ?? new Date().toISOString(),
    }

    let result
    if (currentConfig?.id) {
      result = await supabase
        .from('instagram_config')
        .update(payload)
        .eq('id', currentConfig.id)
        .select('*')
        .single()
    } else {
      result = await supabase
        .from('instagram_config')
        .insert(payload)
        .select('*')
        .single()
    }

    if (result.error) {
      console.error('[instagram/config POST] Save failed:', result.error)
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ config: result.data }, { status: 201 })
  } catch (error) {
    console.error('[instagram/config POST] Internal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
