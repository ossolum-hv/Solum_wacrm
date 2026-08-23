import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import type { Product, ProductType } from '@/types';

export async function GET(request: Request) {
  try {
    const ctx = await requireRole('agent');
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '0', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '25', 10);
    const search = searchParams.get('search')?.trim() ?? '';
    const type = searchParams.get('type') as ProductType | null;
    const isActive = searchParams.get('isActive');
    const sortBy = searchParams.get('sortBy') ?? 'sort_order';
    const sortOrder = searchParams.get('sortOrder') ?? 'asc';

    let query = ctx.supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('account_id', ctx.accountId)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (isActive !== null && isActive !== '') {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[products GET] query error:', error);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    return NextResponse.json({
      products: data ?? [],
      totalCount: count ?? 0,
      page,
      pageSize,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('agent');
    const body = await request.json();

    const {
      name,
      description,
      type,
      price_cents,
      currency = 'USD',
      digital_file_url,
      digital_file_name,
      sku,
      weight_grams,
      requires_shipping = true,
      is_active = true,
      sort_order = 0,
      metadata = {},
      qr_image_url,
    } = body as Partial<Product> & { qr_image_url?: string };

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }
    if (!type || !['digital', 'physical'].includes(type)) {
      return NextResponse.json({ error: 'Valid product type (digital|physical) is required' }, { status: 400 });
    }
    if (price_cents === undefined || price_cents < 0) {
      return NextResponse.json({ error: 'Valid price_cents is required' }, { status: 400 });
    }

    const { data: { session } } = await ctx.supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const normalizedMetadata = { ...(metadata ?? {}) } as Record<string, unknown>;
    const resolvedQrImageUrl = typeof qr_image_url === 'string' ? qr_image_url.trim() : typeof metadata?.qr_image_url === 'string' ? String(metadata.qr_image_url).trim() : '';
    if (resolvedQrImageUrl) {
      normalizedMetadata.qr_image_url = resolvedQrImageUrl;
    } else if ('qr_image_url' in normalizedMetadata) {
      delete normalizedMetadata.qr_image_url;
    }

    const insertPayload = {
      account_id: ctx.accountId,
      user_id: user.id,
      name: name.trim(),
      description: description?.trim() ?? null,
      type,
      price_cents,
      currency: currency.trim().toUpperCase(),
      digital_file_url: digital_file_url?.trim() ?? null,
      digital_file_name: digital_file_name?.trim() ?? null,
      sku: sku?.trim() ?? null,
      weight_grams: weight_grams ?? null,
      requires_shipping,
      is_active,
      sort_order,
      metadata: normalizedMetadata,
    };

    const { data, error } = await ctx.supabase
      .from('products')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('[products POST] insert error:', error);
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}