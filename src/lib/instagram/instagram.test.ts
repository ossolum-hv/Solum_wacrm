import { describe, it, expect, beforeEach, vi } from 'vitest'
import { matchKeyword, buildWaMeDeepLink } from '@/lib/instagram'

// Minimal fake admin client that satisfies the parts keyword-matcher uses.
// We stub supabaseAdmin via module injection isn't needed here; instead we
// test the deep-link builder (pure) and the matcher's matching logic by
// mocking the supabase module.

// Mock the supabase admin client used inside keyword-matcher
vi.mock('@/lib/ai/admin-client', () => ({
  supabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: (field: string, value: string) => ({
          eq: (field2: string, value2: boolean) => ({
            order: () => {
              // filter links by account_id and active
              const all = (globalThis as any).__LINKS__ ?? []
              const filtered = all.filter(
                (l: any) => l.account_id === value && l.active === value2
              )
              return { data: filtered, error: null }
            },
          }),
        }),
      }),
    }),
  }),
}))

describe('instagram module', () => {
  beforeEach(() => {
    // @ts-expect-error test hook
    globalThis.__LINKS__ = []
  })

  describe('buildWaMeDeepLink', () => {
    it('builds a wa.me link with encoded prefill + IG tag', () => {
      const link = buildWaMeDeepLink({
        whatsappNumber: '+1 (555) 123-4567',
        prefillMessage: 'TESTBUY PROD123',
      })
      expect(link).toBe('https://wa.me/15551234567?text=TESTBUY%20PROD123-IG')
    })

    it('accepts a custom source tag', () => {
      const link = buildWaMeDeepLink({
        whatsappNumber: '442071838750',
        prefillMessage: 'hello',
        sourceTag: 'FB',
      })
      expect(link).toBe('https://wa.me/442071838750?text=hello-FB')
    })
  })

  describe('matchKeyword', () => {
    it('matches a keyword contained in comment text (case-insensitive)', async () => {
      // @ts-expect-error test hook
      globalThis.__LINKS__ = [
        {
          id: '1',
          account_id: 'acc1',
          keyword: 'PRICE',
          wa_prefill_message: 'PRICE REQ',
          active: true,
          reply_text: null,
        },
      ]
      const result = await matchKeyword('acc1', 'Hey what is the PRICE?')
      expect(result.matched).toBe(true)
      expect(result.matchedKeyword).toBe('price')
    })

    it('returns no match when nothing matches', async () => {
      // @ts-expect-error test hook
      globalThis.__LINKS__ = [
        { id: '1', account_id: 'acc1', keyword: 'BUY', active: true, wa_prefill_message: 'x' },
      ]
      const result = await matchKeyword('acc1', 'hello there')
      expect(result.matched).toBe(false)
      expect(result.keywordLink).toBeNull()
    })

    it('ignores inactive links', async () => {
      // @ts-expect-error test hook
      globalThis.__LINKS__ = [
        { id: '1', account_id: 'acc1', keyword: 'BUY', active: false, wa_prefill_message: 'x' },
      ]
      const result = await matchKeyword('acc1', 'please BUY now')
      expect(result.matched).toBe(false)
    })

    it('scopes matches to the account id', async () => {
      // @ts-expect-error test hook
      globalThis.__LINKS__ = [
        { id: '1', account_id: 'other', keyword: 'BUY', active: true, wa_prefill_message: 'x' },
      ]
      const result = await matchKeyword('acc1', 'please BUY now')
      expect(result.matched).toBe(false)
    })
  })
})