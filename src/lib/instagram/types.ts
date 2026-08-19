import type { InstagramKeywordLink } from '@/types'

export interface KeywordMatchResult {
  matched: boolean
  keywordLink: InstagramKeywordLink | null
  matchedKeyword: string | null
}

export interface DeepLinkOptions {
  whatsappNumber: string
  prefillMessage: string
  sourceTag?: string
}

export interface PrivateReplyArgs {
  commentId: string
  accessToken: string
  message: string
}

export interface DmReplyArgs {
  recipientIgUserId: string
  accessToken: string
  message: string
}

export interface InstagramWebhookEntry {
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