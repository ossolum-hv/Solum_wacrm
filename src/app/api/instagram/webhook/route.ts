import { NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decrypt, isLegacyFormat, encrypt } from '@/lib/whatsapp/encryption'
import { verifyMetaWebhookSignature } from '@/lib/whatsapp/webhook-signature'
import { matchKeyword } from '@/lib/instagram/keyword-matcher'
import { buildWaMeDeepLink } from '@/lib/instagram/deep-link'
import { isUniqueViolation } from '@/lib/contacts/dedupe'
import { sendPrivateReply, sendDmReply } from '@/lib/instagram/meta-api'
import { runAutomationsForTrigger } from '@/lib/automations/engine'
import { verifyPhoneNumber } from '@/lib/whatsapp/meta-api'
import { reopenClosedConversation } from '@/lib/conversations/reopen'
import type { InstagramConfig } from '@/types'
import type {
  InstagramCommentChange,
  InstagramMessagingEvent,
  InstagramWebhookEntry,
} from '@/lib/instagram/types'

export const maxDuration = 60

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    if (process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN === verifyToken) {
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    const { data: configs, error: configError } = await supabaseAdmin()
      .from('instagram_config')
      .select('id, verify_token')

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
    const { data: config, error: configError } = await supabaseAdmin()
      .from('instagram_config')
      .select('*')
      .eq('ig_business_id', entry.id)
      .eq('status', 'connected')
      .maybeSingle()

    if (configError) {
      console.error('[instagram-webhook] Instagram config lookup failed:', configError)
      continue
    }
    if (!config) continue

    const accessToken = decrypt(config.page_access_token)
    const whatsappNumber = await getWhatsAppNumber(config.account_id)

    for (const change of entry.changes ?? []) {
      const value = change.value
      if (change.field === 'comments' && value.text && value.from?.id && value.comment_id) {
        await handleComment(config, accessToken, whatsappNumber, {
          ...value,
          text: value.text,
          from: value.from,
          comment_id: value.comment_id,
        })
      }
    }

    for (const event of entry.messaging ?? []) {
      if (event.message.is_echo || !event.message.text) continue
      await handleDm(config, accessToken, whatsappNumber, event)
    }
  }
}

async function handleComment(
  config: InstagramConfig,
  accessToken: string,
  whatsappNumber: string | null,
  value: InstagramCommentChange['value'] & {
    text: string
    comment_id: string
    from: { id: string; username?: string }
  }
) {
  const result = await matchKeyword(config.account_id, value.text, 'comment')
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

  const deepLink = whatsappNumber
    ? buildWaMeDeepLink({
        whatsappNumber,
        prefillMessage: result.keywordLink.wa_prefill_message,
      })
    : null

  const replyText = result.keywordLink.reply_text
    ? [result.keywordLink.reply_text, deepLink].filter(Boolean).join('\n')
    : deepLink
      ? `Here's your link:\n${deepLink}`
      : null
  if (!replyText) return

  await sendPrivateReply({
    instagramAccountId: config.ig_business_id,
    commentId: value.comment_id,
    accessToken,
    message: replyText,
  })
}

async function handleDm(
  config: InstagramConfig,
  accessToken: string,
  whatsappNumber: string | null,
  event: InstagramMessagingEvent
) {
  const message = event.message
  if (!message.text || !event.sender.id) return

  const igUserId = event.sender.id
  const igUsername = igUserId

  // Find or create a contact for this Instagram user
  const contactId = await findOrCreateInstagramContact(
    config.account_id,
    config.user_id,
    igUserId,
    igUsername
  )
  if (!contactId) return

  // Find or create a conversation for this contact
  const conversation = await findOrCreateConversation(
    config.account_id,
    config.user_id,
    contactId
  )
  if (!conversation) return
  const conversationId = conversation.id

  const { data: insertedMessages, error: messageError } = await supabaseAdmin()
    .from('messages')
    .upsert(
      {
        conversation_id: conversationId,
        sender_type: 'customer',
        content_type: 'text',
        content_text: message.text,
        message_id: message.mid ?? null,
        status: 'delivered',
        created_at: new Date(event.timestamp ?? Date.now()).toISOString(),
      },
      { onConflict: 'conversation_id,message_id', ignoreDuplicates: true }
    )
    .select('id')

  if (messageError) {
    console.error('[instagram-webhook] Error persisting inbound DM:', messageError)
    return
  }
  if (message.mid && insertedMessages?.length === 0) return

  const { error: conversationError } = await supabaseAdmin().rpc(
    'bump_conversation_on_inbound',
    {
      p_conversation_id: conversationId,
      p_last_message_text: message.text,
    }
  )
  if (conversationError) {
    console.error('[instagram-webhook] Error updating conversation:', conversationError)
  }
  await reopenClosedConversation(supabaseAdmin(), conversation)

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
  const result = await matchKeyword(config.account_id, message.text, 'dm')
  if (!result.matched || !result.keywordLink) return

  const deepLink = whatsappNumber
    ? buildWaMeDeepLink({
        whatsappNumber,
        prefillMessage: result.keywordLink.wa_prefill_message,
      })
    : null

  const replyText = result.keywordLink.reply_text
    ? [result.keywordLink.reply_text, deepLink].filter(Boolean).join('\n')
    : deepLink
      ? `Here's your link:\n${deepLink}`
      : null
  if (!replyText) return

  await sendDmReply({
    instagramAccountId: config.ig_business_id,
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
  const { data: existing, error: existingError } = await supabaseAdmin()
    .from('contacts')
    .select('id')
    .eq('account_id', accountId)
    .eq('phone', `ig:${igUserId}`)
    .maybeSingle()

  if (existingError) {
    console.error('[instagram-webhook] Error finding Instagram contact:', existingError)
    return null
  }

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
    if (isUniqueViolation(createError)) {
      const { data: racedContact, error: racedLookupError } = await supabaseAdmin()
        .from('contacts')
        .select('id')
        .eq('account_id', accountId)
        .eq('phone', `ig:${igUserId}`)
        .maybeSingle()
      if (racedLookupError) {
        console.error('[instagram-webhook] Error resolving duplicate Instagram contact:', racedLookupError)
      } else if (racedContact) {
        return racedContact.id
      }
    }
    console.error('[instagram-webhook] Error creating contact:', createError)
    return null
  }

  return newContact.id
}

async function findOrCreateConversation(
  accountId: string,
  userId: string,
  contactId: string
): Promise<{ id: string; status?: string | null } | null> {
  // Look for existing conversation
  const { data: existing, error: existingError } = await supabaseAdmin()
    .from('conversations')
    .select('id, status')
    .eq('account_id', accountId)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existingError) {
    console.error('[instagram-webhook] Error finding conversation:', existingError)
    return null
  }

  if (existing) {
    return existing
  }

  // Create new conversation
  const { data: newConv, error: createError } = await supabaseAdmin()
    .from('conversations')
    .insert({
      account_id: accountId,
      user_id: userId,
      contact_id: contactId,
    })
    .select('id, status')
    .single()

  if (createError || !newConv) {
    console.error('[instagram-webhook] Error creating conversation:', createError)
    return null
  }

  return newConv
}

async function getWhatsAppNumber(accountId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .from('whatsapp_config')
    .select('phone_number_id, display_phone_number, access_token')
    .eq('account_id', accountId)
    .eq('status', 'connected')
    .maybeSingle()

  if (error || !data?.phone_number_id) {
    if (error) console.error('[instagram-webhook] WhatsApp config lookup failed:', error)
    return null
  }
  if (data.display_phone_number) return data.display_phone_number

  try {
    const phone = await verifyPhoneNumber({
      phoneNumberId: data.phone_number_id,
      accessToken: decrypt(data.access_token),
    })
    const { error: updateError } = await supabaseAdmin()
      .from('whatsapp_config')
      .update({ display_phone_number: phone.display_phone_number })
      .eq('account_id', accountId)
    if (updateError) {
      console.error('[instagram-webhook] Failed to cache WhatsApp display phone:', updateError)
    }
    return phone.display_phone_number
  } catch (error) {
    console.error('[instagram-webhook] Failed to resolve WhatsApp display phone:', error)
    return null
  }
}
