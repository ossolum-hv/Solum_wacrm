import crypto from 'crypto';

export type RazorpayProvider = 'razorpay';

export interface RazorpayConfig {
  provider: RazorpayProvider;
  enabled: boolean;
  keyId?: string;
  keySecret?: string;
  webhookSecret?: string;
  successUrl?: string;
  cancelUrl?: string;
  currency?: string;
  testMode: boolean;
}

export function resolveRazorpayConfig(): RazorpayConfig | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

  if (!keyId && !keySecret && !webhookSecret) {
    return null;
  }

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return {
    provider: 'razorpay',
    enabled: Boolean(keyId && keySecret),
    keyId,
    keySecret,
    webhookSecret,
    successUrl: `${appUrl}/checkout/success`,
    cancelUrl: `${appUrl}/checkout/cancel`,
    currency: 'INR',
    testMode: process.env.NODE_ENV !== 'production',
  };
}

export async function createRazorpayOrder({
  amountCents,
  receipt,
  currency = 'INR',
  notes,
}: {
  amountCents: number;
  receipt?: string;
  currency?: string;
  notes?: Record<string, string>;
}) {
  const config = resolveRazorpayConfig();
  if (!config?.keyId || !config.keySecret) {
    throw new Error('Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the environment.');
  }

  const payload = {
    amount: Math.max(1, Math.round(amountCents)),
    currency: (currency || 'INR').toUpperCase(),
    receipt: receipt || `rcpt_${Date.now()}`,
    notes: notes || {},
  };

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64')}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let parsed: Record<string, any> | null = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // leave null so caller sees the raw response error below
  }

  if (!response.ok) {
    const message = parsed?.error?.description || parsed?.message || text || 'Razorpay order creation failed.';
    throw new Error(message);
  }

  if (!parsed?.id) {
    throw new Error('Razorpay did not return an order id.');
  }

  return {
    id: parsed.id,
    amount: Number(parsed.amount ?? payload.amount),
    currency: String(parsed.currency ?? payload.currency),
    receipt: String(parsed.receipt ?? payload.receipt),
    keyId: config.keyId,
    provider: 'razorpay' as const,
  };
}

export function verifyRazorpayWebhook(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) {
    return null;
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  if (expected !== signature) {
    return null;
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}
