import Stripe from 'stripe';

export type PaymentProvider = 'stripe' | 'razorpay' | 'payu' | 'cashfree';

export interface PaymentGatewayConfig {
  provider: PaymentProvider;
  enabled: boolean;
  publishableKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  merchantWabaId?: string;
  successUrl?: string;
  cancelUrl?: string;
  currency?: string;
  testMode: boolean;
}

export function resolvePaymentGatewayConfig(): PaymentGatewayConfig | null {
  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || process.env.STRIPE_PUBLISHABLE_KEY?.trim();
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() || process.env.RAZORPAY_KEY_ID?.trim();
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  const cashfreeAppId = process.env.CASHFREE_APP_ID?.trim();
  const cashfreeSecretKey = process.env.CASHFREE_SECRET_KEY?.trim();
  const cashfreeWabaId = process.env.CASHFREE_MERCHANT_WABA_ID?.trim();
  const cashfreeWebhookSecret = process.env.CASHFREE_WEBHOOK_SECRET?.trim();

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (cashfreeAppId || cashfreeSecretKey || cashfreeWabaId || cashfreeWebhookSecret) {
    return {
      provider: 'cashfree',
      enabled: Boolean(cashfreeAppId && cashfreeSecretKey),
      publishableKey: cashfreeAppId,
      secretKey: cashfreeSecretKey,
      webhookSecret: cashfreeWebhookSecret,
      merchantWabaId: cashfreeWabaId,
      successUrl: `${appUrl}/checkout/success`,
      cancelUrl: `${appUrl}/checkout/cancel`,
      currency: 'INR',
      testMode: process.env.NODE_ENV !== 'production',
    };
  }

  if (razorpayKeyId || razorpayKeySecret || razorpayWebhookSecret) {
    return {
      provider: 'razorpay',
      enabled: Boolean(razorpayKeyId && razorpayKeySecret),
      publishableKey: razorpayKeyId,
      secretKey: razorpayKeySecret,
      webhookSecret: razorpayWebhookSecret,
      successUrl: `${appUrl}/checkout/success`,
      cancelUrl: `${appUrl}/checkout/cancel`,
      currency: 'INR',
      testMode: process.env.NODE_ENV !== 'production',
    };
  }

  if (!stripePublishableKey && !stripeSecretKey && !stripeWebhookSecret) {
    return null;
  }

  return {
    provider: 'stripe',
    enabled: Boolean(stripeSecretKey),
    publishableKey: stripePublishableKey,
    secretKey: stripeSecretKey,
    webhookSecret: stripeWebhookSecret,
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
