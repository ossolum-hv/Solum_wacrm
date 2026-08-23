import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { createRazorpayPaymentLink, createRazorpayOrder } from '@/lib/payments/razorpay';
import { createStripeCheckoutSession, resolvePaymentGatewayConfig } from '@/lib/payments/stripe';

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
        .select('id, email, name, phone')
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
      .select('id, email, name, phone')
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

    const configuredProvider = resolvePaymentGatewayConfig()?.provider || 'stripe';
    const provider = (typeof body.provider === 'string' ? body.provider.trim().toLowerCase() : configuredProvider) || configuredProvider;
    const amountCents = product.price_cents * normalizedQty;

    const orderPayload = {
      account_id: ctx.accountId,
      user_id: ctx.userId,
      product_id: product.id,
      contact_id: contact.id,
      price_cents: product.price_cents,
      currency: product.currency,
      quantity: normalizedQty,
      status: 'pending',
      payment_provider: provider,
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

    let checkoutUrl = '';
    let sessionId = '';
    let paymentProvider = provider;

    if (provider === 'razorpay') {
      const paymentLink = await createRazorpayPaymentLink({
        orderId: order.id,
        amountCents,
        productName: product.name,
        currency: product.currency,
        customerEmail: contact.email ?? undefined,
        customerName: contact.name ?? undefined,
        customerPhone: contact.phone ?? undefined,
        successUrl: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/success?order_id=${order.id}`,
        cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/cancel?order_id=${order.id}`,
        notes: {
          order_id: order.id,
          product_id: product.id,
          contact_id: contact.id,
          account_id: ctx.accountId,
          source: 'product_checkout',
        },
      });
      checkoutUrl = paymentLink.url;
      sessionId = paymentLink.id;
      paymentProvider = 'razorpay';
      await ctx.supabase
        .from('orders')
        .update({
          payment_intent_id: paymentLink.id,
          payment_url: paymentLink.url,
          payment_provider: 'razorpay',
          metadata: {
            ...(typeof order.metadata === 'object' && order.metadata ? order.metadata : {}),
            checkout_source: 'product_module',
            razorpay_payment_link_id: paymentLink.id,
            product_name: product.name,
          },
        })
        .eq('id', order.id);
    } else {
      const session = await createStripeCheckoutSession({
        amountCents,
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
      checkoutUrl = session.url ?? '';
      sessionId = session.id;
      paymentProvider = 'stripe';
      const updateResult = await ctx.supabase
        .from('orders')
        .update({
          payment_intent_id: session.id,
          payment_url: session.url,
          payment_provider: 'stripe',
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
    }

    return NextResponse.json({
      ok: true,
      provider: paymentProvider,
      orderId: order.id,
      sessionId,
      checkoutUrl,
      amountCents,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
