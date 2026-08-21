import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

let _adminClient: any = null
function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _adminClient
}

async function resolveAccountId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data?.account_id) return null
  return data.account_id as string
}

function requireString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) {
      return NextResponse.json({ keywords: [] })
    }

    const { data, error } = await supabase
      .from('instagram_keyword_links')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[instagram/keywords GET] Query failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ keywords: data ?? [] })
  } catch (error) {
    console.error('[instagram/keywords GET] Internal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) {
      return NextResponse.json({ error: 'Your profile is not linked to an account.' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const keyword = requireString(body.keyword)
    const waPrefillMessage = requireString(body.wa_prefill_message)
    const replyText = typeof body.reply_text === 'string' ? body.reply_text.trim() : ''
    const sourceType = body.source_type === 'comment' || body.source_type === 'dm' ? body.source_type : 'both'
    const active = body.active === undefined ? true : Boolean(body.active)

    if (!keyword || !waPrefillMessage) {
      return NextResponse.json(
        { error: 'keyword and wa_prefill_message are required.' },
        { status: 400 }
      )
    }

    const payload = {
      account_id: accountId,
      user_id: user.id,
      keyword,
      wa_prefill_message: waPrefillMessage,
      source_type: sourceType,
      active,
      reply_text: replyText || null,
    }

    let result
    if (typeof body.id === 'string' && body.id.trim()) {
      result = await supabase
        .from('instagram_keyword_links')
        .update(payload)
        .eq('id', body.id)
        .select('*')
        .single()
    } else {
      result = await supabase
        .from('instagram_keyword_links')
        .insert(payload)
        .select('*')
        .single()
    }

    if (result.error) {
      console.error('[instagram/keywords POST] Save failed:', result.error)
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ keyword_link: result.data }, { status: 201 })
  } catch (error) {
    console.error('[instagram/keywords POST] Internal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) {
      return NextResponse.json({ error: 'Your profile is not linked to an account.' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const id = typeof body?.id === 'string' ? body.id.trim() : null
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin()
      .from('instagram_keyword_links')
      .delete()
      .eq('id', id)
      .eq('account_id', accountId)

    if (error) {
      console.error('[instagram/keywords DELETE] Delete failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[instagram/keywords DELETE] Internal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
