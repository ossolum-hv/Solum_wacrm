import { NextResponse } from 'next/server';

import { createStripeCheckoutSession } from '@/lib/payments/stripe';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const amountCents = Number(body.amountCents ?? body.amount_cents ?? 0);
    const productName = typeof body.productName === 'string' ? body.productName.trim() : 'Purchase';
    const quantity = Number(body.quantity ?? 1);
    const currency = typeof body.currency === 'string' ? body.currency.trim().toUpperCase() || 'USD' : 'USD';
    const successUrl = typeof body.successUrl === 'string' ? body.successUrl.trim() : undefined;
    const cancelUrl = typeof body.cancelUrl === 'string' ? body.cancelUrl.trim() : undefined;
    const customerEmail = typeof body.customerEmail === 'string' ? body.customerEmail.trim() || undefined : undefined;

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: 'A valid amountCents value is required.' }, { status: 400 });
    }

    const session = await createStripeCheckoutSession({
      amountCents,
      productName,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      currency,
      successUrl,
      cancelUrl,
      customerEmail,
    });

    return NextResponse.json({
      url: session.url,
      id: session.id,
      status: 'created',
    });
  } catch (error) {
    console.error('[payments/checkout POST] error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to create payment checkout session.',
    }, { status: 500 });
  }
}
