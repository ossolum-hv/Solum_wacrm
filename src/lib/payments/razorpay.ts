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
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() || process.env.RAZORPAY_KEY_ID?.trim();
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

export interface CreateRazorpayPaymentLinkInput {
  orderId: string;
  amountCents: number;
  productName: string;
  currency?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  successUrl?: string;
  cancelUrl?: string;
  notes?: Record<string, string>;
  description?: string;
  expireInMinutes?: number;
}

export async function createRazorpayPaymentLink({
  orderId,
  amountCents,
  productName,
  currency = 'INR',
  customerEmail,
  customerPhone,
  customerName,
  successUrl,
  cancelUrl,
  notes,
  description,
  expireInMinutes = 30,
}: CreateRazorpayPaymentLinkInput) {
  const config = resolveRazorpayConfig();
  if (!config?.keyId || !config.keySecret) {
    throw new Error('Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the environment.');
  }

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const finalSuccessUrl = successUrl || `${appUrl}/checkout/success?order_id=${encodeURIComponent(orderId)}`;
  const finalCancelUrl = cancelUrl || `${appUrl}/checkout/cancel?order_id=${encodeURIComponent(orderId)}`;

  const payload: Record<string, any> = {
    amount: Math.max(1, Math.round(amountCents)),
    currency: (currency || 'INR').toUpperCase(),
    description: description || productName,
    callback_url: finalSuccessUrl,
    callback_method: 'get',
    notes: {
      order_id: orderId,
      product_name: productName,
      ...(notes ?? {}),
    },
    expire_by: Math.floor((Date.now() + expireInMinutes * 60 * 1000) / 1000),
  };

  if (customerEmail || customerPhone || customerName) {
    payload.customer = {
      ...(customerEmail ? { email: customerEmail } : {}),
      ...(customerPhone ? { contact: customerPhone } : {}),
      ...(customerName ? { name: customerName } : {}),
    };
  }

  const response = await fetch('https://api.razorpay.com/v1/payment_links', {
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
    const message = parsed?.error?.description || parsed?.message || text || 'Razorpay payment link creation failed.';
    throw new Error(message);
  }

  const paymentUrl = parsed?.short_url || parsed?.url || parsed?.payment_link || parsed?.link?.short_url || '';
  if (!paymentUrl) {
    throw new Error('Razorpay Payment Link API did not return a short URL.');
  }

  return {
    id: parsed?.id || orderId,
    url: paymentUrl,
    status: parsed?.status || 'created',
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
