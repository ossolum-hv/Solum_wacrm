'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, CreditCard, Loader2, ShieldCheck, WalletCards } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SettingsPanelHead } from './settings-panel-head';

interface PaymentGatewayConfig {
  provider: 'stripe';
  enabled: boolean;
  publishableKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  successUrl?: string;
  cancelUrl?: string;
  currency?: string;
  testMode: boolean;
}

const initialConfig: PaymentGatewayConfig = {
  provider: 'stripe',
  enabled: false,
  publishableKey: '',
  secretKey: '',
  webhookSecret: '',
  successUrl: '',
  cancelUrl: '',
  currency: 'USD',
  testMode: true,
};

export function PaymentGatewaySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<PaymentGatewayConfig>(initialConfig);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/config', { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to load payment gateway settings.');
      }

      setConfig({
        ...initialConfig,
        ...payload.config,
      });
    } catch (error) {
      console.error('[PaymentGatewaySettings] load error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load payment settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/payments/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to save payment gateway settings.');
      }

      setConfig({
        ...config,
        ...payload.config,
      });
      toast.success('Payment gateway settings saved.');
    } catch (error) {
      console.error('[PaymentGatewaySettings] save error:', error);
      toast.error(error instanceof Error ? error.message : 'Unable to save payment gateway settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleDemoCheckout = async () => {
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: 'Demo purchase',
          amountCents: 1999,
          currency: config.currency || 'USD',
          quantity: 1,
          successUrl: config.successUrl || undefined,
          cancelUrl: config.cancelUrl || undefined,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Checkout creation failed.');
      }
      window.open(payload.url, '_blank', 'noopener,noreferrer');
      toast.success('Stripe checkout session created.');
    } catch (error) {
      console.error('[PaymentGatewaySettings] checkout error:', error);
      toast.error(error instanceof Error ? error.message : 'Stripe checkout failed.');
    }
  };

  return (
    <div className="space-y-6">
      <SettingsPanelHead
        title="Payment gateway"
        description="Connect your payment provider for Stripe checkout, product purchases, and payment links."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <WalletCards className="h-4 w-4" />
                Stripe configuration
              </CardTitle>
              <CardDescription>Enable checkout and payment links using a Stripe account.</CardDescription>
            </div>
            <Badge variant={config.enabled ? 'default' : 'outline'}>
              {config.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/25 p-3">
            <div>
              <div className="font-medium">Provider status</div>
              <div className="text-sm text-muted-foreground">Live Stripe configuration and checkout availability.</div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {config.enabled ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <ShieldCheck className="h-4 w-4 text-muted-foreground" />}
              <span>{config.enabled ? 'Ready' : 'Waiting for keys'}</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading payment gateway settings...
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Provider</Label>
                  <div className="flex h-10 items-center rounded-md border border-input bg-muted/30 px-3 text-sm text-muted-foreground">
                    Stripe
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="publishable-key">Publishable key</Label>
                  <Input
                    id="publishable-key"
                    value={config.publishableKey || ''}
                    onChange={(event) => setConfig((prev) => ({ ...prev, publishableKey: event.target.value }))}
                    placeholder="pk_live_... or pk_test_..."
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="secret-key">Secret key</Label>
                  <Input
                    id="secret-key"
                    type="password"
                    value={config.secretKey || ''}
                    onChange={(event) => setConfig((prev) => ({ ...prev, secretKey: event.target.value }))}
                    placeholder="sk_live_... or sk_test_..."
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="webhook-secret">Webhook secret</Label>
                  <Input
                    id="webhook-secret"
                    type="password"
                    value={config.webhookSecret || ''}
                    onChange={(event) => setConfig((prev) => ({ ...prev, webhookSecret: event.target.value }))}
                    placeholder="whsec_..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="success-url">Success URL</Label>
                  <Input
                    id="success-url"
                    value={config.successUrl || ''}
                    onChange={(event) => setConfig((prev) => ({ ...prev, successUrl: event.target.value }))}
                    placeholder="https://your-domain.com/checkout/success"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cancel-url">Cancel URL</Label>
                  <Input
                    id="cancel-url"
                    value={config.cancelUrl || ''}
                    onChange={(event) => setConfig((prev) => ({ ...prev, cancelUrl: event.target.value }))}
                    placeholder="https://your-domain.com/checkout/cancel"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={config.currency || 'USD'}
                    onChange={(event) => setConfig((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
                    placeholder="USD"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mode</Label>
                  <div className="flex h-10 items-center rounded-md border border-input bg-muted/30 px-3 text-sm text-muted-foreground">
                    {config.testMode ? 'Test mode' : 'Live mode'}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border bg-muted/25 p-3">
                <div>
                  <div className="font-medium">Gateway enabled</div>
                  <div className="text-sm text-muted-foreground">Allow Stripe checkout sessions to be created from the app.</div>
                </div>
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(value) => setConfig((prev) => ({ ...prev, enabled: value }))}
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <Button variant="outline" onClick={handleDemoCheckout}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Create demo checkout
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save gateway'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
