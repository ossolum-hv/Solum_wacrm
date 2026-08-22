import { NextResponse } from 'next/server';

import { resolvePaymentGatewayConfig } from '@/lib/payments/stripe';

export async function GET() {
  try {
    const config = resolvePaymentGatewayConfig();

    return NextResponse.json({
      configured: Boolean(config?.enabled),
      config: config ?? {
        provider: 'stripe',
        enabled: false,
        publishableKey: '',
        secretKey: '',
        webhookSecret: '',
        successUrl: '',
        cancelUrl: '',
        currency: 'USD',
        testMode: process.env.NODE_ENV !== 'production',
      },
    });
  } catch (error) {
    console.error('[payments/config GET] error:', error);
    return NextResponse.json({ error: 'Failed to load payment gateway configuration.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const provider = body.provider;
    if (provider !== 'stripe') {
      return NextResponse.json({ error: 'Unsupported payment provider.' }, { status: 400 });
    }

    const publishableKey = typeof body.publishableKey === 'string' ? body.publishableKey.trim() : '';
    const secretKey = typeof body.secretKey === 'string' ? body.secretKey.trim() : '';
    const webhookSecret = typeof body.webhookSecret === 'string' ? body.webhookSecret.trim() : '';
    const enabled = body.enabled === true;
    const successUrl = typeof body.successUrl === 'string' ? body.successUrl.trim() : '';
    const cancelUrl = typeof body.cancelUrl === 'string' ? body.cancelUrl.trim() : '';
    const currency = typeof body.currency === 'string' ? body.currency.trim().toUpperCase() || 'USD' : 'USD';

    if (enabled && !secretKey) {
      return NextResponse.json({ error: 'A Stripe secret key is required before enabling checkout.' }, { status: 400 });
    }

    const config = {
      provider: 'stripe' as const,
      enabled,
      publishableKey,
      secretKey,
      webhookSecret,
      successUrl,
      cancelUrl,
      currency,
      testMode: process.env.NODE_ENV !== 'production',
    };

    return NextResponse.json({
      configured: enabled,
      config,
    });
  } catch (error) {
    console.error('[payments/config POST] error:', error);
    return NextResponse.json({ error: 'Failed to save payment gateway configuration.' }, { status: 500 });
  }
}
