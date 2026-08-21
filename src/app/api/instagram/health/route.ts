import { NextResponse } from 'next/server'
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

    return NextResponse.json({
      connected: Boolean(config && config.status === 'connected'),
      status: config?.status ?? 'disconnected',
      webhookSubscribed: Boolean(config?.webhook_subscribed),
      keywordCount: keywords?.length ?? 0,
      activeKeywordCount,
      lastSyncedAt: config?.last_synced_at ?? config?.connected_at ?? null,
      igUsername: config?.ig_username ?? null,
      isConfigured,
      message: config ? undefined : 'Instagram not connected yet.',
    })
  } catch (error) {
    console.error('[instagram/health] Internal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
