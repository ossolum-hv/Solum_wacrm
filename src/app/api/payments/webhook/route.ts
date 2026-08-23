import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { verifyRazorpayWebhook } from '@/lib/payments/razorpay';
import { verifyStripeWebhook } from '@/lib/payments/stripe';

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const stripeSig = request.headers.get('stripe-signature');
    const razorpaySig = request.headers.get('x-razorpay-signature');

    const stripeEvent = verifyStripeWebhook(rawBody, stripeSig);
    if (stripeEvent) {
      const admin = supabaseAdmin();
      const obj = stripeEvent.data.object as {
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
      const eventType = String(stripeEvent.type);

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
    }

    const razorpayEvent = verifyRazorpayWebhook(rawBody, razorpaySig);
    if (razorpayEvent) {
      const admin = supabaseAdmin();
      const eventName = String(razorpayEvent.event || '');
      const payment = razorpayEvent.payload?.payment?.entity as Record<string, any> | undefined;
      const order = razorpayEvent.payload?.order?.entity as Record<string, any> | undefined;
      const notes = payment?.notes || order?.notes || {};
      const orderId = notes.order_id || notes.orderId;

      if (
        eventName === 'payment.captured' ||
        eventName === 'payment.authorized' ||
        eventName === 'payment_link.paid' ||
        eventName === 'order.paid'
      ) {
        if (orderId) {
          await admin
            .from('orders')
            .update({
              status: 'paid',
              payment_provider: 'razorpay',
              payment_intent_id: payment?.id || order?.id || orderId,
              paid_at: new Date().toISOString(),
              metadata: {
                ...(notes ?? {}),
                razorpay_event: eventName,
                razorpay_payment_id: payment?.id || null,
                razorpay_order_id: order?.id || null,
              },
            })
            .eq('id', orderId);
        }
        return NextResponse.json({ received: true }, { status: 200 });
      }

      if (eventName === 'payment.failed' || eventName === 'payment.cancelled') {
        if (orderId) {
          await admin
            .from('orders')
            .update({
              status: 'cancelled',
              payment_provider: 'razorpay',
              payment_intent_id: payment?.id || order?.id || orderId,
              metadata: {
                ...(notes ?? {}),
                razorpay_event: eventName,
                razorpay_payment_id: payment?.id || null,
                razorpay_order_id: order?.id || null,
              },
            })
            .eq('id', orderId);
        }
      }

      return NextResponse.json({ received: true }, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid payment webhook signature.' }, { status: 400 });
  } catch (error) {
    console.error('[payments/webhook] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
