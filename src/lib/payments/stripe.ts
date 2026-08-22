import Stripe from 'stripe';

export type PaymentProvider = 'stripe' | 'razorpay' | 'payu';

export interface PaymentGatewayConfig {
  provider: PaymentProvider;
  enabled: boolean;
  publishableKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  successUrl?: string;
  cancelUrl?: string;
  currency?: string;
  testMode: boolean;
}

export function resolvePaymentGatewayConfig(): PaymentGatewayConfig | null {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || process.env.STRIPE_PUBLISHABLE_KEY?.trim();
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!publishableKey && !secretKey && !webhookSecret) {
    return null;
  }

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return {
    provider: 'stripe',
    enabled: Boolean(secretKey),
    publishableKey,
    secretKey,
    webhookSecret,
    successUrl: `${appUrl}/checkout/success`,
    cancelUrl: `${appUrl}/checkout/cancel`,
    currency: 'USD',
    testMode: process.env.NODE_ENV !== 'production',
  };
}

export function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    return null;
  }

  return new Stripe(secretKey);
}

export function getStripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || null;
}

export function verifyStripeWebhook(rawBody: string, signature: string | null): Stripe.Event | null {
  const secret = getStripeWebhookSecret();
  const stripe = getStripeClient();

  if (!secret || !stripe || !signature) {
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (error) {
    console.error('[payments/stripe] webhook verification failed:', error);
    return null;
  }
}

export async function createStripeCheckoutSession({
  amountCents,
  currency = 'USD',
  productName,
  quantity = 1,
  successUrl,
  cancelUrl,
  customerEmail,
  metadata,
}: {
  amountCents: number;
  currency?: string;
  productName: string;
  quantity?: number;
  successUrl?: string;
  cancelUrl?: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}) {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error('Stripe is not configured. Add STRIPE_SECRET_KEY to the environment.');
  }

  const finalSuccessUrl = successUrl || `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/success`;
  const finalCancelUrl = cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/cancel`;

  return stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: amountCents,
          product_data: {
            name: productName,
          },
        },
      },
    ],
    success_url: finalSuccessUrl,
    cancel_url: finalCancelUrl,
    customer_email: customerEmail,
    metadata: {
      source: 'solum-wacrm',
      ...(metadata ?? {}),
    },
  });
}
