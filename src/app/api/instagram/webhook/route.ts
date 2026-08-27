import { NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decrypt, isLegacyFormat, encrypt } from '@/lib/whatsapp/encryption'
import { verifyMetaWebhookSignature } from '@/lib/whatsapp/webhook-signature'
import { matchKeyword } from '@/lib/instagram/keyword-matcher'
import { buildWaMeDeepLink } from '@/lib/instagram/deep-link'
import { sendPrivateReply, sendDmReply } from '@/lib/instagram/meta-api'
import { runAutomationsForTrigger } from '@/lib/automations/engine'
import type { InstagramConfig } from '@/types'

export const maxDuration = 60

let _adminClient: any = null
function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _adminClient
}


interface InstagramWebhookEntry {
  id: string
  changes: Array<{
    field: 'messages' | 'comments'
    value: {
      messaging_product: 'instagram'
      comment_id?: string
      media?: { id: string; comment_count: number }
      from?: { id: string; username: string }
      text?: string
      messages?: Array<{
        id: string
        from: { id: string; username: string }
        text?: string
        timestamp: string
      }>
    }
  }>
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('hub.mode')
    const challenge = searchParams.get('hub.challenge')
    const verifyToken = searchParams.get('hub.verify_token')

    if (mode !== 'subscribe' || !challenge || !verifyToken) {
      return NextResponse.json(
        { error: 'Missing verification parameters' },
        { status: 400 }
      )
    }

    const { data: configs, error: configError } = await supabaseAdmin()
      .from('instagram_config')
      .select('id, verify_token')
      .eq('webhook_subscribed', true)

    if (configError || !configs) {
      console.error('[instagram-webhook] Error fetching configs for verification:', configError)
      return NextResponse.json(
        { error: 'Verification failed' },
        { status: 403 }
      )
    }

    let matchedConfig: InstagramConfig | null = null
    for (const config of configs) {
      if (!config.verify_token) continue
      try {
        if (decrypt(config.verify_token) === verifyToken) {
          matchedConfig = config as InstagramConfig
          break
        }
      } catch {
      }
    }

    if (matchedConfig) {
      if (isLegacyFormat(matchedConfig.verify_token)) {
        void supabaseAdmin()
          .from('instagram_config')
          .update({ verify_token: encrypt(verifyToken) })
          .eq('id', matchedConfig.id)
          .then(({ error }: { error: unknown }) => {
            if (error) {
              console.warn(
                '[instagram-webhook] verify_token GCM upgrade failed:',
                (error as { message?: string })?.message ?? error
              )
            }
          })
      }
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    return NextResponse.json(
      { error: 'Verification token mismatch' },
      { status: 403 }
    )
  } catch (error) {
    console.error('[instagram-webhook] Error in GET verification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-hub-signature-256')

    if (!verifyMetaWebhookSignature(rawBody, signature)) {
      console.warn('[instagram-webhook] rejected request with invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    let body: { entry?: InstagramWebhookEntry[] }
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    after(async () => {
      try {
        await processWebhook(body)
      } catch (error) {
        console.error('[instagram-webhook] Error processing webhook:', error)
      }
    })

    return NextResponse.json({ status: 'received' }, { status: 200 })
  } catch (error) {
    console.error('[instagram-webhook] Error in POST handler:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function processWebhook(body: { entry?: InstagramWebhookEntry[] }) {
  if (!body.entry) return

  for (const entry of body.entry) {
    for (const change of entry.changes) {
      const field = change.field
      const value = change.value

      const { data: config, error: configError } = await supabaseAdmin()
        .from('instagram_config')
        .select('*')
        .eq('ig_business_id', entry.id)
        .eq('status', 'connected')
        .maybeSingle()

      if (configError || !config) continue

      const accessToken = decrypt(config.page_access_token)
      const whatsappNumber = await getWhatsAppNumber(config.account_id)
      if (!whatsappNumber) continue

      if (field === 'comments' && value.text && value.from?.id && value.comment_id) {
        await handleComment(config, accessToken, whatsappNumber, value)
      } else if (field === 'messages' && value.messages && value.messages.length > 0) {
        await handleDm(config, accessToken, whatsappNumber, value.messages[0])
      }
    }
  }
}

async function handleComment(
  config: InstagramConfig,
  accessToken: string,
  whatsappNumber: string,
  value: any
) {
  const result = await matchKeyword(config.account_id, value.text)
  if (!result.matched || !result.keywordLink) return

  // Trigger automations for comments (without contact/conversation context)
  // This allows automations to respond to Instagram comments
  await runAutomationsForTrigger({
    accountId: config.account_id,
    triggerType: 'keyword_match',
    contactId: null,
    context: {
      message_text: value.text,
    },
  }).catch((err) =>
    console.error('[instagram-webhook] comment automation dispatch failed:', err)
  )

  const deepLink = buildWaMeDeepLink({
    whatsappNumber,
    prefillMessage: result.keywordLink.wa_prefill_message,
  })

  const replyText = result.keywordLink.reply_text
    ? `${result.keywordLink.reply_text}\n${deepLink}`
    : `Here's your link:\n${deepLink}`

  await sendPrivateReply({
    commentId: value.comment_id!,
    accessToken,
    message: replyText,
  })
}

async function handleDm(
  config: InstagramConfig,
  accessToken: string,
  whatsappNumber: string,
  message: any
) {
  if (!message.text || !message.from?.id) return

  const igUserId = message.from.id
  const igUsername = message.from.username || igUserId

  // Find or create a contact for this Instagram user
  const contactId = await findOrCreateInstagramContact(
    config.account_id,
    config.user_id,
    igUserId,
    igUsername
  )
  if (!contactId) return

  // Find or create a conversation for this contact
  const conversationId = await findOrCreateConversation(
    config.account_id,
    config.user_id,
    contactId
  )
  if (!conversationId) return

  // Trigger automations with the keyword_match trigger
  // This fires any automations configured to trigger on keywords
  await runAutomationsForTrigger({
    accountId: config.account_id,
    triggerType: 'keyword_match',
    contactId,
    context: {
      message_text: message.text,
      conversation_id: conversationId,
    },
  }).catch((err) =>
    console.error('[instagram-webhook] automation dispatch failed:', err)
  )

  // Also check for instagram_keyword_links and send wa.me link if matched
  const result = await matchKeyword(config.account_id, message.text)
  if (!result.matched || !result.keywordLink) return

  const deepLink = buildWaMeDeepLink({
    whatsappNumber,
    prefillMessage: result.keywordLink.wa_prefill_message,
  })

  const replyText = result.keywordLink.reply_text
    ? `${result.keywordLink.reply_text}\n${deepLink}`
    : `Here's your link:\n${deepLink}`

  await sendDmReply({
    recipientIgUserId: igUserId,
    accessToken,
    message: replyText,
  })
}

async function findOrCreateInstagramContact(
  accountId: string,
  userId: string,
  igUserId: string,
  igUsername: string
): Promise<string | null> {
  // Check if a contact with this Instagram ID already exists
  const { data: existing } = await supabaseAdmin()
    .from('contacts')
    .select('id')
    .eq('account_id', accountId)
    .eq('phone', `ig:${igUserId}`)
    .maybeSingle()

  if (existing) {
    return existing.id
  }

  // Create new contact for this Instagram user
  const { data: newContact, error: createError } = await supabaseAdmin()
    .from('contacts')
    .insert({
      account_id: accountId,
      user_id: userId,
      phone: `ig:${igUserId}`,
      name: igUsername,
    })
    .select('id')
    .single()

  if (createError || !newContact) {
    console.error('[instagram-webhook] Error creating contact:', createError)
    return null
  }

  return newContact.id
}

async function findOrCreateConversation(
  accountId: string,
  userId: string,
  contactId: string
): Promise<string | null> {
  // Look for existing conversation
  const { data: existing } = await supabaseAdmin()
    .from('conversations')
    .select('id')
    .eq('account_id', accountId)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existing) {
    return existing.id
  }

  // Create new conversation
  const { data: newConv, error: createError } = await supabaseAdmin()
    .from('conversations')
    .insert({
      account_id: accountId,
      user_id: userId,
      contact_id: contactId,
    })
    .select('id')
    .single()

  if (createError || !newConv) {
    console.error('[instagram-webhook] Error creating conversation:', createError)
    return null
  }

  return newConv.id
}

async function getWhatsAppNumber(accountId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .from('whatsapp_config')
    .select('phone_number_id')
    .eq('account_id', accountId)
    .eq('status', 'connected')
    .maybeSingle()

  if (error || !data?.phone_number_id) return null
  return data.phone_number_id
}
