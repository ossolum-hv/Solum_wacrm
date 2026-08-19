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