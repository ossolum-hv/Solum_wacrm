import { supabaseAdmin } from '@/lib/ai/admin-client'
import type { InstagramKeywordLink } from '@/types'
import type { KeywordMatchResult } from './types'

/**
 * Match incoming text against active keyword links for an account.
 * Case-insensitive, trimmed. Supports 'contains' (substring) matching.
 * Returns first match (deterministic ordering by created_at).
 */
export async function matchKeyword(
  accountId: string,
  text: string
): Promise<KeywordMatchResult> {
  const normalized = text.trim().toLowerCase()
  if (!normalized) return { matched: false, keywordLink: null, matchedKeyword: null }

  const { data: links, error } = await supabaseAdmin()
    .from('instagram_keyword_links')
    .select('*')
    .eq('account_id', accountId)
    .eq('active', true)
    .order('created_at', { ascending: true })

  if (error || !links || links.length === 0) {
    return { matched: false, keywordLink: null, matchedKeyword: null }
  }

  for (const link of links as InstagramKeywordLink[]) {
    const keyword = link.keyword.trim().toLowerCase()
    if (normalized.includes(keyword)) {
      return { matched: true, keywordLink: link, matchedKeyword: keyword }
    }
  }

  return { matched: false, keywordLink: null, matchedKeyword: null }
}