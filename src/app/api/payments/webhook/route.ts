import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { runAutomationsForTrigger } from '@/lib/automations/engine';
import { verifyRazorpayWebhook } from '@/lib/payments/razorpay';
import { verifyStripeWebhook } from '@/lib/payments/stripe';

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function resolveOrderFulfillmentState(
  admin: ReturnType<typeof supabaseAdmin>,
  orderId: string,
) {
  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('product_id, fulfillment_status, fulfilled_at, metadata')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError || !order) {
    return {
      fulfillment_status: 'pending',
      fulfilled_at: null,
    };
  }

  const { data: product, error: productError } = await admin
    .from('products')
    .select('type')
    .eq('id', order.product_id)
    .maybeSingle();

  if (productError || !product) {
    return {
      fulfillment_status: order.fulfillment_status ?? 'pending',
      fulfilled_at: order.fulfilled_at ?? null,
    };
  }

  const isDigitalProduct = product.type === 'digital';

  return {
    fulfillment_status: isDigitalProduct ? 'fulfilled' : 'pending',
    fulfilled_at: isDigitalProduct ? (order.fulfilled_at ?? new Date().toISOString()) : null,
  };
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
          const fulfillment = await resolveOrderFulfillmentState(admin, orderId);
          const { data: orderRow, error: orderReadErr } = await admin
            .from('orders')
            .select('id, account_id, contact_id, product_id')
            .eq('id', orderId)
            .maybeSingle();

          await admin
            .from('orders')
            .update({
              status: 'paid',
              payment_provider: 'stripe',
              payment_intent_id: obj.id,
              paid_at: new Date().toISOString(),
              fulfillment_status: fulfillment.fulfillment_status,
              fulfilled_at: fulfillment.fulfilled_at,
              metadata: {
                ...(metadata ?? {}),
                stripe_checkout_id: obj.id,
                payment_status: obj.payment_status ?? 'paid',
              },
            })
            .eq('id', orderId);

          if (!orderReadErr && orderRow) {
            await runAutomationsForTrigger({
              accountId: orderRow.account_id,
              triggerType: 'order_paid',
              contactId: orderRow.contact_id,
              context: {
                order_id: orderRow.id,
                product_id: orderRow.product_id,
                vars: {
                  order_id: orderRow.id,
                  product_id: orderRow.product_id,
                },
              },
            });
          }
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
              fulfillment_status: 'failed',
              fulfilled_at: null,
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
              fulfillment_status: 'failed',
              fulfilled_at: null,
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
      const paymentLink = razorpayEvent.payload?.payment_link?.entity as Record<string, any> | undefined;
      // Check notes in all possible entities: payment, order, or payment_link
      const notes = payment?.notes || order?.notes || paymentLink?.notes || {};
      const orderId = notes.order_id || notes.orderId;

      if (
        eventName === 'payment.captured' ||
        eventName === 'payment.authorized' ||
        eventName === 'payment_link.paid' ||
        eventName === 'order.paid'
      ) {
        if (orderId) {
          // Atomic idempotency: only update + trigger if status is NOT 'paid'
          // This prevents race conditions from concurrent webhook events
          const fulfillment = await resolveOrderFulfillmentState(admin, orderId);

          const { data: updatedOrder, error: updateErr } = await admin
            .from('orders')
            .update({
              status: 'paid',
              payment_provider: 'razorpay',
              payment_intent_id: payment?.id || order?.id || paymentLink?.id || orderId,
              paid_at: new Date().toISOString(),
              fulfillment_status: fulfillment.fulfillment_status,
              fulfilled_at: fulfillment.fulfilled_at,
              metadata: {
                ...(notes ?? {}),
                razorpay_event: eventName,
                razorpay_payment_id: payment?.id || null,
                razorpay_order_id: order?.id || null,
                razorpay_payment_link_id: paymentLink?.id || null,
              },
            })
            .eq('id', orderId)
            .neq('status', 'paid')  // Only update if NOT already paid
            .select('id, account_id, contact_id, product_id, status')
            .maybeSingle();

          if (updateErr) {
            console.error('[payments/webhook] Update failed:', updateErr);
            return NextResponse.json({ received: true }, { status: 200 });
          }

          // If no row was updated, order was already paid — skip automation
          if (!updatedOrder) {
            console.log('[payments/webhook] Order already paid, skipping:', orderId);
            return NextResponse.json({ received: true }, { status: 200 });
          }

          // Trigger automation only on successful atomic update
          await runAutomationsForTrigger({
            accountId: updatedOrder.account_id,
            triggerType: 'order_paid',
            contactId: updatedOrder.contact_id,
            context: {
              order_id: updatedOrder.id,
              product_id: updatedOrder.product_id,
              vars: {
                order_id: updatedOrder.id,
                product_id: updatedOrder.product_id,
              },
            },
          });
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
              payment_intent_id: payment?.id || order?.id || paymentLink?.id || orderId,
              fulfillment_status: 'failed',
              fulfilled_at: null,
              metadata: {
                ...(notes ?? {}),
                razorpay_event: eventName,
                razorpay_payment_id: payment?.id || null,
                razorpay_order_id: order?.id || null,
                razorpay_payment_link_id: paymentLink?.id || null,
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
