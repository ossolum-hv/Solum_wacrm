import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { verifyStripeWebhook } from '@/lib/payments/stripe';

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: Request) {
  try {
    const sig = request.headers.get('stripe-signature');
    const rawBody = await request.text();

    const event = verifyStripeWebhook(rawBody, sig);
    if (!event) {
      return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const obj = event.data.object as {
      id: string;
      payment_status?: string;
      status?: string;
      metadata?: Record<string, string>;
      amount_total?: number;
      currency?: string;
      customer_email?: string;
    };

    const metadata = obj.metadata ?? {};
    const orderId = metadata.order_id;
    const eventType = String(event.type);

    if (eventType === 'checkout.session.completed' || eventType === 'checkout.session.async_payment_succeeded') {
      if (orderId) {
        await admin
          .from('orders')
          .update({
            status: 'paid',
            payment_provider: 'stripe',
            payment_intent_id: obj.id,
            paid_at: new Date().toISOString(),
            metadata: {
              ...(metadata ?? {}),
              stripe_checkout_id: obj.id,
              payment_status: obj.payment_status ?? 'paid',
            },
          })
          .eq('id', orderId);
      }
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (eventType === 'checkout.session.expired' || eventType === 'checkout.session.async_payment_failed') {
      if (orderId) {
        await admin
          .from('orders')
          .update({
            status: 'cancelled',
            payment_provider: 'stripe',
            payment_intent_id: obj.id,
            metadata: {
              ...(metadata ?? {}),
              stripe_checkout_id: obj.id,
              payment_status: obj.payment_status ?? 'failed',
            },
          })
          .eq('id', orderId);
      }
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (eventType === 'checkout.session.canceled') {
      if (orderId) {
        await admin
          .from('orders')
          .update({
            status: 'cancelled',
            payment_provider: 'stripe',
            payment_intent_id: obj.id,
            metadata: {
              ...(metadata ?? {}),
              stripe_checkout_id: obj.id,
              payment_status: obj.payment_status ?? 'cancelled',
            },
          })
          .eq('id', orderId);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[payments/webhook] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
