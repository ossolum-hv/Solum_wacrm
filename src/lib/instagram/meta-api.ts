import type { PrivateReplyArgs, DmReplyArgs } from './types'
import { META_GRAPH_API_BASE } from '@/lib/meta-graph'

interface MetaErrorResponse {
  error?: { message?: string }
}

async function throwMetaError(response: Response, fallback: string): Promise<never> {
  let message = fallback
  try {
    const data = await response.json() as MetaErrorResponse
    if (data.error?.message) message = data.error.message
  } catch {
    // Keep the HTTP status fallback when Meta returns a non-JSON body.
  }
  throw new Error(message)
}

export async function verifyInstagramPageToken({
  pageId,
  igBusinessId,
  accessToken,
}: {
  pageId: string
  igBusinessId: string
  accessToken: string
}): Promise<{ id: string; name?: string; username?: string | null }> {
  const url = `${META_GRAPH_API_BASE}/${pageId}?fields=id,name,instagram_business_account{id,username}&access_token=${encodeURIComponent(accessToken)}`
  const response = await fetch(url, { method: 'GET' })

  if (!response.ok) {
    await throwMetaError(response, `Instagram page validation failed: ${response.status}`)
  }

  const data = await response.json() as {
    id?: string
    name?: string
    instagram_business_account?: { id?: string; username?: string }
    instagram_business_accounts?: { data?: Array<{ id?: string; username?: string }> }
  }
  const match = data.instagram_business_account ?? data.instagram_business_accounts?.data?.[0] ?? null

  if (!data.id) {
    throw new Error('Meta did not return a valid Facebook Page ID.')
  }

  if (!match?.id || match.id !== igBusinessId) {
    throw new Error(`This Page token is not connected to Instagram Business ID ${igBusinessId}.`)
  }

  return {
    id: data.id,
    name: data.name,
    username: match.username ?? null,
  }
}

export async function subscribeInstagramPageWebhooks({
  pageId,
  accessToken,
}: {
  pageId: string
  accessToken: string
}): Promise<void> {
  const params = new URLSearchParams({
    subscribed_fields: 'messages,comments',
    access_token: accessToken,
  })
  const response = await fetch(`${META_GRAPH_API_BASE}/${pageId}/subscribed_apps?${params}`, {
    method: 'POST',
  })

  if (!response.ok) {
    await throwMetaError(response, `Instagram webhook subscription failed: ${response.status}`)
  }
}

export async function isInstagramPageWebhookSubscribed({
  pageId,
  accessToken,
  appId,
}: {
  pageId: string
  accessToken: string
  appId: string
}): Promise<boolean> {
  const params = new URLSearchParams({
    fields: 'id,subscribed_fields',
    access_token: accessToken,
  })
  const response = await fetch(`${META_GRAPH_API_BASE}/${pageId}/subscribed_apps?${params}`, {
    method: 'GET',
  })

  if (!response.ok) {
    await throwMetaError(response, `Instagram webhook status check failed: ${response.status}`)
  }

  const result = await response.json() as {
    data?: Array<{ id?: string; subscribed_fields?: string[] }>
  }
  const app = result.data?.find((item) => item.id === appId)
  return Boolean(app?.subscribed_fields?.includes('messages') && app.subscribed_fields.includes('comments'))
}

/**
 * Send a private reply to a comment (Meta-sanctioned path).
 * POST /{instagram-account-id}/messages with the comment ID as recipient.
 * This moves the conversation from public comment → DM thread.
 */
export async function sendPrivateReply(args: PrivateReplyArgs): Promise<{ message_id: string }> {
  const { instagramAccountId, commentId, accessToken, message } = args
  const url = `${META_GRAPH_API_BASE}/${instagramAccountId}/messages`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { comment_id: commentId },
      message: { text: message },
    }),
  })

  if (!response.ok) await throwMetaError(response, `Private reply failed: ${response.status}`)
  const data = await response.json() as { message_id?: string }
  if (!data.message_id) throw new Error('Meta did not return a private-reply message ID.')
  return { message_id: data.message_id }
}

/**
 * Send a DM reply in an existing thread.
 * Uses the Instagram Messaging API.
 */
export async function sendDmReply(args: DmReplyArgs): Promise<{ message_id: string }> {
  const { instagramAccountId, recipientIgUserId, accessToken, message } = args
  const url = `${META_GRAPH_API_BASE}/${instagramAccountId}/messages`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { id: recipientIgUserId },
      message: { text: message },
      messaging_type: 'RESPONSE',
    }),
  })

  if (!response.ok) await throwMetaError(response, `DM reply failed: ${response.status}`)
  const data = await response.json() as { message_id?: string }
  if (!data.message_id) throw new Error('Meta did not return a DM message ID.')
  return { message_id: data.message_id }
}