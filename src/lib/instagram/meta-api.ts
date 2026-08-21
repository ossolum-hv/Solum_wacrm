import type { PrivateReplyArgs, DmReplyArgs } from './types'

const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

async function throwMetaError(response: Response, fallback: string): Promise<never> {
  let message = fallback
  try {
    const data = await response.json()
    if (data.error?.message) message = data.error.message
  } catch {}
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
  const url = `${META_API_BASE}/${pageId}?fields=id,name,instagram_business_account{id,username}&access_token=${encodeURIComponent(accessToken)}`
  const response = await fetch(url, { method: 'GET' })

  if (!response.ok) {
    await throwMetaError(response, `Instagram page validation failed: ${response.status}`)
  }

  const data = await response.json()
  const match = data.instagram_business_account ?? data.instagram_business_accounts?.data?.[0] ?? null

  if (!data.id) {
    throw new Error('Meta did not return a valid Facebook Page ID.')
  }

  if (!match || match.id !== igBusinessId) {
    throw new Error(`This Page token is not connected to Instagram Business ID ${igBusinessId}.`)
  }

  return {
    id: data.id,
    name: data.name,
    username: match.username ?? null,
  }
}

/**
 * Send a private reply to a comment (Meta-sanctioned path).
 * POST /{comment-id}/private_replies
 * This moves the conversation from public comment → DM thread.
 */
export async function sendPrivateReply(args: PrivateReplyArgs): Promise<{ message_id: string }> {
  const { commentId, accessToken, message } = args
  const url = `${META_API_BASE}/${commentId}/private_replies`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  })

  if (!response.ok) await throwMetaError(response, `Private reply failed: ${response.status}`)
  const data = await response.json()
  return { message_id: data.id }
}

/**
 * Send a DM reply in an existing thread.
 * Uses the Instagram Messaging API.
 */
export async function sendDmReply(args: DmReplyArgs): Promise<{ message_id: string }> {
  const { recipientIgUserId, accessToken, message } = args
  const url = `${META_API_BASE}/${recipientIgUserId}/messages`
  
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
  const data = await response.json()
  return { message_id: data.message_id }
}