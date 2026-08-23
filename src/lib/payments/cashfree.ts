export type CashfreeProvider = 'cashfree';

export interface CashfreeConfig {
  provider: CashfreeProvider;
  enabled: boolean;
  appId?: string;
  secretKey?: string;
  merchantWabaId?: string;
  webhookSecret?: string;
  successUrl?: string;
  cancelUrl?: string;
  currency?: string;
  testMode: boolean;
}

export function resolveCashfreeConfig(): CashfreeConfig | null {
  const appId = process.env.CASHFREE_APP_ID?.trim();
  const secretKey = process.env.CASHFREE_SECRET_KEY?.trim();
  const merchantWabaId = process.env.CASHFREE_MERCHANT_WABA_ID?.trim();
  const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET?.trim();

  if (!appId && !secretKey && !merchantWabaId && !webhookSecret) {
    return null;
  }

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return {
    provider: 'cashfree',
    enabled: Boolean(appId && secretKey),
    appId,
    secretKey,
    merchantWabaId,
    webhookSecret,
    successUrl: `${appUrl}/checkout/success`,
    cancelUrl: `${appUrl}/checkout/cancel`,
    currency: 'INR',
    testMode: process.env.NODE_ENV !== 'production',
  };
}

export interface CreateCashfreePaymentLinkInput {
  orderId: string;
  amountCents: number;
  productName: string;
  currency?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  merchantWabaId?: string;
  successUrl?: string;
  cancelUrl?: string;
  notes?: string;
}

export async function createCashfreePaymentLink({
  orderId,
  amountCents,
  productName,
  currency = 'INR',
  customerEmail,
  customerPhone,
  customerName,
  merchantWabaId,
  successUrl,
  cancelUrl,
  notes,
}: CreateCashfreePaymentLinkInput) {
  const config = resolveCashfreeConfig();
  const resolvedWabaId = (merchantWabaId || config?.merchantWabaId || process.env.CASHFREE_MERCHANT_WABA_ID || '').trim();

  if (!config?.appId || !config.secretKey) {
    throw new Error('Cashfree is not configured. Add CASHFREE_APP_ID and CASHFREE_SECRET_KEY to the environment.');
  }
  if (!resolvedWabaId) {
    throw new Error('Cashfree Merchant WABA ID is required to create a WhatsApp payment link.');
  }

  const baseUrl = process.env.CASHFREE_BASE_URL?.trim() || 'https://api.cashfree.com/pg';
  const finalSuccessUrl = successUrl || config.successUrl || `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/success`;
  const finalCancelUrl = cancelUrl || config.cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/cancel`;

  const payload = {
    link_id: orderId,
    link_amount: Number((amountCents / 100).toFixed(2)),
    link_currency: currency.toUpperCase(),
    link_purpose: notes || `Payment for ${productName}`,
    link_note: notes || `Payment for ${productName}`,
    customer_details: {
      customer_id: orderId,
      customer_name: customerName || 'Customer',
      customer_email: customerEmail || undefined,
      customer_phone: customerPhone || undefined,
    },
    link_notify: true,
    link_auto_reminders: true,
    link_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    link_url: finalSuccessUrl,
    return_url: finalSuccessUrl,
    cancel_url: finalCancelUrl,
  };

  const response = await fetch(`${baseUrl}/payment-links`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'x-client-id': config.appId,
      'x-client-secret': config.secretKey,
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  let parsed: Record<string, any> | null = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    // leave parsed as null so the caller sees the raw response text in the error.
  }

  if (!response.ok) {
    const message = parsed?.message || parsed?.error || raw || 'Cashfree payment link creation failed.';
    throw new Error(message);
  }

  const url = parsed?.link_url || parsed?.payment_link || parsed?.link?.link_url || parsed?.link?.payment_link || '';
  if (!url) {
    throw new Error('Cashfree Payment Link API did not return a payment URL.');
  }

  return {
    id: parsed?.link_id || parsed?.id || orderId,
    url,
    status: parsed?.status || 'created',
    provider: 'cashfree' as const,
  };
}
