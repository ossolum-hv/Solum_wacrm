import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import type { Product } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('agent');
    const { id } = await params;

    const { data, error } = await ctx.supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .maybeSingle();

    if (error) {
      console.error('[products GET] query error:', error);
      return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('agent');
    const { id } = await params;
    const body = await request.json();

    const {
      name,
      description,
      type,
      price_cents,
      currency,
      digital_file_url,
      digital_file_name,
      sku,
      weight_grams,
      requires_shipping,
      is_active,
      sort_order,
      metadata,
      qr_image_url,
    } = body as Partial<Product> & { qr_image_url?: string };

    const updatePayload: Partial<Product> = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: 'Product name cannot be empty' }, { status: 400 });
      }
      updatePayload.name = name.trim();
    }
    if (description !== undefined) updatePayload.description = description?.trim() ?? null;
    if (type !== undefined) {
      if (!['digital', 'physical'].includes(type)) {
        return NextResponse.json({ error: 'Valid product type (digital|physical) is required' }, { status: 400 });
      }
      updatePayload.type = type;
    }
    if (price_cents !== undefined) {
      if (price_cents < 0) {
        return NextResponse.json({ error: 'price_cents must be >= 0' }, { status: 400 });
      }
      updatePayload.price_cents = price_cents;
    }
    if (currency !== undefined) updatePayload.currency = currency.trim().toUpperCase();
    if (digital_file_url !== undefined) updatePayload.digital_file_url = digital_file_url?.trim() ?? null;
    if (digital_file_name !== undefined) updatePayload.digital_file_name = digital_file_name?.trim() ?? null;
    if (sku !== undefined) updatePayload.sku = sku?.trim() ?? null;
    if (weight_grams !== undefined) updatePayload.weight_grams = weight_grams ?? null;
    if (requires_shipping !== undefined) updatePayload.requires_shipping = requires_shipping;
    if (is_active !== undefined) updatePayload.is_active = is_active;
    if (sort_order !== undefined) updatePayload.sort_order = sort_order;
    if (metadata !== undefined || qr_image_url !== undefined) {
      const mergedMetadata = { ...((metadata ?? {}) as Record<string, unknown>) };
      const resolvedQrImageUrl = typeof qr_image_url === 'string' ? qr_image_url.trim() : typeof metadata?.qr_image_url === 'string' ? String(metadata.qr_image_url).trim() : '';
      if (resolvedQrImageUrl) {
        mergedMetadata.qr_image_url = resolvedQrImageUrl;
      } else if ('qr_image_url' in mergedMetadata) {
        delete mergedMetadata.qr_image_url;
      }
      updatePayload.metadata = mergedMetadata;
    }

    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from('products')
      .update(updatePayload)
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .select('*')
      .single();

    if (error) {
      console.error('[products PUT] update error:', error);
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('agent');
    const { id } = await params;

    // Check if product has any orders before allowing delete
    const { data: orders, error: ordersError } = await ctx.supabase
      .from('orders')
      .select('id')
      .eq('product_id', id)
      .limit(1);

    if (ordersError) {
      console.error('[products DELETE] orders check error:', ordersError);
      return NextResponse.json({ error: 'Failed to check product references' }, { status: 500 });
    }

    if (orders && orders.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete product with existing orders. Deactivate instead.' },
        { status: 409 }
      );
    }

    const { error } = await ctx.supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('account_id', ctx.accountId);

    if (error) {
      console.error('[products DELETE] delete error:', error);
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}