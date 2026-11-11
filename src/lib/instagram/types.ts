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
  instagramAccountId: string
  commentId: string
  accessToken: string
  message: string
}

export interface DmReplyArgs {
  instagramAccountId: string
  recipientIgUserId: string
  accessToken: string
  message: string
}

export interface InstagramCommentChange {
  field: 'comments' | string
  value: {
    comment_id?: string
    media?: { id: string; comment_count?: number }
    from?: { id: string; username?: string }
    text?: string
  }
}

export interface InstagramMessagingEvent {
  sender: { id: string }
  recipient: { id: string }
  timestamp?: number
  message: {
    mid?: string
    text?: string
    is_echo?: boolean
    is_deleted?: boolean
    is_unsupported?: boolean
    quick_reply?: { payload?: string }
  }
}

export interface InstagramWebhookEntry {
  id: string
  changes?: InstagramCommentChange[]
  messaging?: InstagramMessagingEvent[]
}