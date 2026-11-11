import { NextResponse } from 'next/server'
import {
  ForbiddenError,
  requireRole,
  toErrorResponse,
  UnauthorizedError,
} from '@/lib/auth/account'
import { decrypt } from '@/lib/whatsapp/encryption'
import {
  subscribeInstagramPageWebhooks,
  verifyInstagramPageToken,
} from '@/lib/instagram/meta-api'

export async function POST() {
  try {
    const { supabase, accountId } = await requireRole('admin')

    const { data: config, error: configError } = await supabase
      .from('instagram_config')
      .select('id, page_id, ig_business_id, page_access_token')
      .eq('account_id', accountId)
      .maybeSingle()

    if (configError) {
      console.error('[instagram/config/subscribe] Config lookup failed:', configError)
      return NextResponse.json({ error: 'Failed to load Instagram configuration.' }, { status: 500 })
    }
    if (!config) {
      return NextResponse.json({ error: 'Connect an Instagram account before subscribing.' }, { status: 404 })
    }

    const appId = process.env.META_APP_ID
    if (!appId) {
      return NextResponse.json({ error: 'META_APP_ID is not configured.' }, { status: 500 })
    }

    const accessToken = decrypt(config.page_access_token)
    await verifyInstagramPageToken({
      pageId: config.page_id,
      igBusinessId: config.ig_business_id,
      accessToken,
    })
    await subscribeInstagramPageWebhooks({ pageId: config.page_id, accessToken })

    const { error: updateError } = await supabase
      .from('instagram_config')
      .update({ webhook_subscribed: true })
      .eq('id', config.id)

    if (updateError) {
      console.error('[instagram/config/subscribe] Subscription status update failed:', updateError)
      return NextResponse.json({ error: 'Meta subscription succeeded, but its status could not be saved.' }, { status: 500 })
    }

    return NextResponse.json({ webhookSubscribed: true })
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return toErrorResponse(error)
    }
    const message = error instanceof Error ? error.message : 'Unknown Meta API error'
    console.error('[instagram/config/subscribe] Subscription failed:', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
