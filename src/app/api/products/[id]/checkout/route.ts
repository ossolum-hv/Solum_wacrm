import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { createStripeCheckoutSession } from '@/lib/payments/stripe';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireRole('agent');
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const quantity = Number(body.quantity ?? 1);
    const contactId = typeof body.contact_id === 'string' ? body.contact_id.trim() : '';

    const { data: product, error: productError } = await ctx.supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .maybeSingle();

    if (productError) {
      console.error('[products checkout] product lookup failed:', productError);
      return NextResponse.json({ error: 'Failed to load product.' }, { status: 500 });
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    if (!product.is_active) {
      return NextResponse.json({ error: 'This product is inactive.' }, { status: 400 });
    }

    const normalizedQty = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;

    let targetContactId = contactId;
    if (!targetContactId) {
      const { data: fallbackContact, error: contactError } = await ctx.supabase
        .from('contacts')
        .select('id, email')
        .eq('account_id', ctx.accountId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (contactError) {
        console.error('[products checkout] contact lookup failed:', contactError);
        return NextResponse.json({ error: 'Failed to find a valid contact for checkout.' }, { status: 500 });
      }

      if (!fallbackContact) {
        return NextResponse.json({ error: 'A contact record is required before checkout can begin.' }, { status: 400 });
      }

      targetContactId = fallbackContact.id;
    }

    const { data: contact, error: contactError } = await ctx.supabase
      .from('contacts')
      .select('id, email')
      .eq('id', targetContactId)
      .eq('account_id', ctx.accountId)
      .maybeSingle();

    if (contactError) {
      console.error('[products checkout] contact validation failed:', contactError);
      return NextResponse.json({ error: 'Invalid contact selection.' }, { status: 500 });
    }

    if (!contact) {
      return NextResponse.json({ error: 'The selected contact is not valid for this account.' }, { status: 400 });
    }

    const orderPayload = {
      account_id: ctx.accountId,
      user_id: ctx.userId,
      product_id: product.id,
      contact_id: contact.id,
      price_cents: product.price_cents,
      currency: product.currency,
      quantity: normalizedQty,
      status: 'pending',
      payment_provider: 'stripe',
      payment_url: null,
      fulfillment_status: 'pending',
      metadata: {
        checkout_source: 'product_module',
        product_name: product.name,
      },
    };

    const { data: order, error: orderError } = await ctx.supabase
      .from('orders')
      .insert(orderPayload)
      .select('*')
      .single();

    if (orderError || !order) {
      console.error('[products checkout] order creation failed:', orderError);
      return NextResponse.json({ error: 'Failed to create the order record.' }, { status: 500 });
    }

    const session = await createStripeCheckoutSession({
      amountCents: product.price_cents * normalizedQty,
      productName: product.name,
      quantity: normalizedQty,
      currency: product.currency,
      customerEmail: contact.email ?? undefined,
      successUrl: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/success?order_id=${order.id}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/cancel?order_id=${order.id}`,
      metadata: {
        order_id: order.id,
        product_id: product.id,
        contact_id: contact.id,
        account_id: ctx.accountId,
        source: 'product_checkout',
      },
    });

    const updateResult = await ctx.supabase
      .from('orders')
      .update({
        payment_intent_id: session.id,
        payment_url: session.url,
        metadata: {
          ...(typeof order.metadata === 'object' && order.metadata ? order.metadata : {}),
          checkout_source: 'product_module',
          stripe_checkout_id: session.id,
          product_name: product.name,
        },
      })
      .eq('id', order.id)
      .select('*')
      .single();

    if (updateResult.error) {
      console.error('[products checkout] order update failed:', updateResult.error);
    }

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      sessionId: session.id,
      checkoutUrl: session.url,
      amountCents: product.price_cents * normalizedQty,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
