import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/whatsapp/encryption'
import {
  isInstagramPageWebhookSubscribed,
  verifyInstagramPageToken,
} from '@/lib/instagram/meta-api'

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
      return NextResponse.json({
        connected: false,
        status: 'disconnected',
        webhookSubscribed: false,
        keywordCount: 0,
        activeKeywordCount: 0,
        lastSyncedAt: null,
        igUsername: null,
        isConfigured: false,
      })
    }

    const { data: config, error: configError } = await supabase
      .from('instagram_config')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle()

    if (configError) {
      console.error('[instagram/health] Config query failed:', configError)
      return NextResponse.json({ error: 'Failed to fetch Instagram health.' }, { status: 500 })
    }

    const { data: keywords, error: keywordsError } = await supabase
      .from('instagram_keyword_links')
      .select('id, active')
      .eq('account_id', accountId)

    if (keywordsError) {
      console.error('[instagram/health] Keyword query failed:', keywordsError)
      return NextResponse.json({ error: 'Failed to fetch Instagram keywords.' }, { status: 500 })
    }

    const activeKeywordCount = keywords?.filter((link) => Boolean(link.active)).length ?? 0
    const isConfigured = Boolean(config)
    let connected = Boolean(config && config.status === 'connected')
    let webhookSubscribed = false
    let webhookMessage: string | undefined

    if (config?.status === 'connected') {
      try {
        await verifyInstagramPageToken({
          pageId: config.page_id,
          igBusinessId: config.ig_business_id,
          accessToken: decrypt(config.page_access_token),
        })
      } catch (error) {
        connected = false
        webhookMessage = error instanceof Error ? error.message : 'Instagram credentials could not be verified.'
        console.error('[instagram/health] Credential check failed:', webhookMessage)
      }

      const appId = process.env.META_APP_ID
      if (connected && !appId) {
        webhookMessage = 'META_APP_ID is not configured, so webhook subscription health cannot be checked.'
      } else if (connected && appId) {
        try {
          webhookSubscribed = await isInstagramPageWebhookSubscribed({
            pageId: config.page_id,
            accessToken: decrypt(config.page_access_token),
            appId,
          })
          if (!webhookSubscribed) {
            webhookMessage = 'Meta does not report this app subscribed to both Instagram comments and messages.'
          }
        } catch (error) {
          webhookMessage = error instanceof Error ? error.message : 'Unable to check Meta webhook subscription.'
          console.error('[instagram/health] Webhook status check failed:', webhookMessage)
        }
      }
    }

    return NextResponse.json({
      connected,
      status: connected ? 'connected' : config?.status === 'connected' ? 'expired' : config?.status ?? 'disconnected',
      webhookSubscribed,
      keywordCount: keywords?.length ?? 0,
      activeKeywordCount,
      lastSyncedAt: config?.last_synced_at ?? null,
      igUsername: config?.ig_username ?? null,
      isConfigured,
      message: config ? webhookMessage : 'Instagram not connected yet.',
    })
  } catch (error) {
    console.error('[instagram/health] Internal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
