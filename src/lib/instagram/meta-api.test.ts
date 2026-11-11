import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  isInstagramPageWebhookSubscribed,
  sendDmReply,
  sendPrivateReply,
  subscribeInstagramPageWebhooks,
} from './meta-api'
import { META_GRAPH_API_BASE } from '@/lib/meta-graph'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Instagram Meta API requests', () => {
  it('sends DMs through the Instagram account messages edge', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ message_id: 'dm-1' })))
    vi.stubGlobal('fetch', fetchMock)

    await expect(sendDmReply({
      instagramAccountId: 'ig-account',
      recipientIgUserId: 'customer',
      accessToken: 'token',
      message: 'Hello',
    })).resolves.toEqual({ message_id: 'dm-1' })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(`${META_GRAPH_API_BASE}/ig-account/messages`)
    expect(JSON.parse(String(init.body))).toEqual({
      recipient: { id: 'customer' },
      message: { text: 'Hello' },
      messaging_type: 'RESPONSE',
    })
  })

  it('sends private replies using the comment recipient on the Instagram messages edge', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ message_id: 'reply-1' })))
    vi.stubGlobal('fetch', fetchMock)

    await expect(sendPrivateReply({
      instagramAccountId: 'ig-account',
      commentId: 'comment-1',
      accessToken: 'token',
      message: 'Thanks',
    })).resolves.toEqual({ message_id: 'reply-1' })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(`${META_GRAPH_API_BASE}/ig-account/messages`)
    expect(JSON.parse(String(init.body))).toEqual({
      recipient: { comment_id: 'comment-1' },
      message: { text: 'Thanks' },
    })
  })

  it('subscribes the Facebook Page to comment and message webhooks', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true })))
    vi.stubGlobal('fetch', fetchMock)

    await subscribeInstagramPageWebhooks({ pageId: 'page-1', accessToken: 'page-token' })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const parsedUrl = new URL(url)
    expect(parsedUrl.pathname).toBe(`${new URL(META_GRAPH_API_BASE).pathname}/page-1/subscribed_apps`)
    expect(parsedUrl.searchParams.get('subscribed_fields')).toBe('messages,comments')
    expect(init.method).toBe('POST')
  })

  it('reports the subscription only when this app has both fields enabled', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: [
        { id: 'other-app', subscribed_fields: ['messages', 'comments'] },
        { id: 'our-app', subscribed_fields: ['messages', 'comments'] },
      ],
    }))))

    await expect(isInstagramPageWebhookSubscribed({
      pageId: 'page-1',
      accessToken: 'page-token',
      appId: 'our-app',
    })).resolves.toBe(true)
    await expect(isInstagramPageWebhookSubscribed({
      pageId: 'page-1',
      accessToken: 'page-token',
      appId: 'other-app',
    })).resolves.toBe(true)
  })
})
