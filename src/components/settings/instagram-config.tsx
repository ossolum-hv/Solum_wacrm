'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wifi,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { SettingsPanelHead } from './settings-panel-head';

type SourceType = 'comment' | 'dm' | 'both';

type InstagramHealth = {
  connected: boolean;
  status: 'connected' | 'disconnected' | 'expired';
  webhookSubscribed: boolean;
  keywordCount: number;
  activeKeywordCount: number;
  lastSyncedAt: string | null;
  igUsername: string | null;
  isConfigured: boolean;
  message?: string;
};

const emptyKeywordForm: {
  keyword: string;
  wa_prefill_message: string;
  source_type: SourceType;
  reply_text: string;
  active: boolean;
} = {
  keyword: '',
  wa_prefill_message: '',
  source_type: 'both',
  reply_text: '',
  active: true,
};

type InstagramConfigRow = {
  id: string;
  account_id: string;
  user_id: string;
  ig_business_id: string;
  ig_username: string;
  page_id: string;
  page_access_token: string;
  verify_token: string;
  status: 'connected' | 'disconnected' | 'expired';
  webhook_subscribed: boolean;
  connected_at: string;
  created_at: string;
  updated_at: string;
};

type InstagramKeywordLinkRow = {
  id: string;
  account_id: string;
  user_id: string;
  keyword: string;
  wa_prefill_message: string;
  source_type: SourceType;
  active: boolean;
  reply_text?: string | null;
  created_at: string;
  updated_at: string;
};

export function InstagramConfig() {
  const { user, accountId, loading: authLoading, profileLoading, canEditSettings } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [health, setHealth] = useState<InstagramHealth | null>(null);
  const [config, setConfig] = useState<InstagramConfigRow | null>(null);
  const [links, setLinks] = useState<InstagramKeywordLinkRow[]>([]);
  const [igBusinessId, setIgBusinessId] = useState('');
  const [igUsername, setIgUsername] = useState('');
  const [pageId, setPageId] = useState('');
  const [pageAccessToken, setPageAccessToken] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [webhookSubscribed, setWebhookSubscribed] = useState(true);
  const [keywordDraft, setKeywordDraft] = useState(emptyKeywordForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [linkSaving, setLinkSaving] = useState(false);

  const fetchHealth = useCallback(async () => {
    if (!accountId) return;

    try {
      const response = await fetch('/api/instagram/health', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        console.error('Failed to load Instagram health:', payload.error ?? response.statusText);
        setHealth(null);
        return;
      }
      setHealth(payload as InstagramHealth);
    } catch (error) {
      console.error('Failed to load Instagram health:', error);
      setHealth(null);
    }
  }, [accountId]);

  const fetchConfig = useCallback(async () => {
    if (!accountId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/instagram/config', { cache: 'no-store' });
      const payload = await response.json();

      if (!response.ok) {
        console.error('Failed to load Instagram config:', payload.error ?? payload.message ?? response.statusText);
        setConfig(null);
        setIgBusinessId('');
        setIgUsername('');
        setPageId('');
        setPageAccessToken('');
        setVerifyToken('');
        setWebhookSubscribed(true);
        return;
      }

      const data = payload.config ?? null;
      if (data) {
        setConfig(data as InstagramConfigRow);
        setIgBusinessId(data.ig_business_id || '');
        setIgUsername(data.ig_username || '');
        setPageId(data.page_id || '');
        setPageAccessToken('');
        setVerifyToken('');
        setWebhookSubscribed(Boolean(data.webhook_subscribed));
      } else {
        setConfig(null);
        setIgBusinessId('');
        setIgUsername('');
        setPageId('');
        setPageAccessToken('');
        setVerifyToken('');
        setWebhookSubscribed(true);
      }
    } catch (error) {
      console.error('Failed to load Instagram config:', error);
      setConfig(null);
      setIgBusinessId('');
      setIgUsername('');
      setPageId('');
      setPageAccessToken('');
      setVerifyToken('');
      setWebhookSubscribed(true);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const fetchLinks = useCallback(async () => {
    if (!accountId) return;

    try {
      const response = await fetch('/api/instagram/keywords', { cache: 'no-store' });
      const payload = await response.json();

      if (!response.ok) {
        console.error('Failed to load Instagram keyword links:', payload.error ?? response.statusText);
        setLinks([]);
        return;
      }

      setLinks((payload.keywords as InstagramKeywordLinkRow[]) ?? []);
    } catch (error) {
      console.error('Failed to load Instagram keyword links:', error);
      setLinks([]);
    }
  }, [accountId]);

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user || !accountId) {
      setLoading(false);
      return;
    }

    void fetchHealth();
    void fetchConfig();
    void fetchLinks();
  }, [authLoading, profileLoading, user?.id, accountId, fetchHealth, fetchConfig, fetchLinks]);

  async function handleConnectInstagram() {
    if (!canEditSettings) return;
    setOauthBusy(true);
    try {
      const response = await fetch('/api/instagram/oauth', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to start Instagram OAuth flow.');
      }
      if (!payload.url) {
        throw new Error('Instagram OAuth URL was not returned.');
      }
      window.location.href = payload.url;
    } catch (error) {
      console.error('Instagram OAuth init failed:', error);
      window.alert(error instanceof Error ? error.message : 'Could not start Instagram OAuth.');
    } finally {
      setOauthBusy(false);
    }
  }

  async function handleSaveConfig() {
    if (!user || !accountId) return;
    if (!canEditSettings) return;

    setSaving(true);
    try {
      const payload = {
        ig_business_id: igBusinessId.trim(),
        ig_username: igUsername.trim(),
        page_id: pageId.trim(),
        page_access_token: pageAccessToken.trim(),
        verify_token: verifyToken.trim(),
        webhook_subscribed: webhookSubscribed,
      };

      if (!payload.ig_business_id || !payload.ig_username || !payload.page_id) {
        throw new Error('Please complete all required fields.');
      }

      const response = await fetch('/api/instagram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save Instagram configuration.');
      }

      setConfig(result.config as InstagramConfigRow);
      setPageAccessToken('');
      setVerifyToken('');
      await fetchHealth();
    } catch (error) {
      console.error('Save Instagram config failed:', error);
      window.alert(error instanceof Error ? error.message : 'Failed to save Instagram configuration.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveLink() {
    if (!user || !accountId) return;
    if (!canEditSettings) return;

    setLinkSaving(true);
    try {
      const trimmedKeyword = keywordDraft.keyword.trim();
      const trimmedMessage = keywordDraft.wa_prefill_message.trim();
      const trimmedReply = keywordDraft.reply_text.trim();

      if (!trimmedKeyword || !trimmedMessage) {
        throw new Error('Keyword and WhatsApp prefill message are required.');
      }

      const payload = {
        id: editingId ?? undefined,
        keyword: trimmedKeyword,
        wa_prefill_message: trimmedMessage,
        source_type: keywordDraft.source_type,
        active: keywordDraft.active,
        reply_text: trimmedReply || null,
      };

      const response = await fetch('/api/instagram/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save Instagram keyword.');
      }

      setKeywordDraft(emptyKeywordForm);
      setEditingId(null);
      await fetchLinks();
      await fetchHealth();
    } catch (error) {
      console.error('Save Instagram keyword failed:', error);
      window.alert(error instanceof Error ? error.message : 'Failed to save Instagram keyword.');
    } finally {
      setLinkSaving(false);
    }
  }

  async function handleDeleteLink(id: string) {
    if (!canEditSettings) return;
    const confirmDelete = window.confirm('Delete this Instagram keyword link?');
    if (!confirmDelete) return;

    try {
      const response = await fetch('/api/instagram/keywords', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete Instagram keyword.');
      }

      await fetchLinks();
      await fetchHealth();
      if (editingId === id) {
        setEditingId(null);
        setKeywordDraft(emptyKeywordForm);
      }
    } catch (error) {
      console.error('Delete Instagram keyword failed:', error);
      window.alert(error instanceof Error ? error.message : 'Failed to delete Instagram keyword.');
    }
  }

  const startEditLink = (link: InstagramKeywordLinkRow) => {
    setEditingId(link.id);
    setKeywordDraft({
      keyword: link.keyword,
      wa_prefill_message: link.wa_prefill_message,
      source_type: link.source_type,
      reply_text: link.reply_text ?? '',
      active: link.active,
    });
  };

  const statusTone = health?.connected ? 'default' : 'outline';

  return (
    <div className="space-y-6">
      <SettingsPanelHead
        title="Instagram"
        description="Connect your Instagram Business account and map keywords to WhatsApp deep links."
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Connection & analytics
              </CardTitle>
              <CardDescription>Live status, OAuth connection, and keyword activity at a glance.</CardDescription>
            </div>
            <Badge variant={health?.connected ? 'default' : 'outline'}>
              {health?.connected ? 'Connected' : 'Not connected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-md border border-border bg-muted/25 p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wifi className="h-4 w-4" />
                Connection
              </div>
              <div className="mt-2 text-xl font-semibold">
                {health?.connected ? 'Live' : 'Offline'}
              </div>
            </div>
            <div className="rounded-md border border-border bg-muted/25 p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                Webhooks
              </div>
              <div className="mt-2 text-xl font-semibold">
                {health?.webhookSubscribed ? 'Active' : 'Paused'}
              </div>
            </div>
            <div className="rounded-md border border-border bg-muted/25 p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4" />
                Keywords
              </div>
              <div className="mt-2 text-xl font-semibold">
                {health?.activeKeywordCount ?? 0}
              </div>
            </div>
            <div className="rounded-md border border-border bg-muted/25 p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                Last sync
              </div>
              <div className="mt-2 text-sm font-medium">
                {health?.lastSyncedAt ? new Date(health.lastSyncedAt).toLocaleDateString() : 'Not synced'}
              </div>
            </div>
          </div>

          {!health?.isConfigured ? (
            <div className="flex items-start gap-3 rounded-md border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 text-amber-500" />
              <div>
                <div className="font-medium text-foreground">No Instagram Business account connected yet.</div>
                <div className="mt-1">Connect with Meta OAuth or manually enter your business credentials below.</div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleConnectInstagram} disabled={oauthBusy || !canEditSettings}>
              {oauthBusy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connecting...</> : 'Connect Instagram'}
            </Button>
            {health?.webhookSubscribed ? (
              <Badge variant="secondary">Webhook health: healthy</Badge>
            ) : (
              <Badge variant="outline">Webhook health: paused</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Business account
          </CardTitle>
          <CardDescription>Store the Instagram account metadata and webhook secret used by the CRM.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading Instagram settings...
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ig-business-id">Instagram Business ID</Label>
                  <Input id="ig-business-id" value={igBusinessId} onChange={(e) => setIgBusinessId(e.target.value)} placeholder="1784140001234567" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ig-username">Instagram username</Label>
                  <Input id="ig-username" value={igUsername} onChange={(e) => setIgUsername(e.target.value)} placeholder="@yourbrand" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="page-id">Facebook Page ID</Label>
                  <Input id="page-id" value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="123456789012345" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <div className="flex h-10 items-center rounded-md border border-input bg-muted/30 px-3 text-sm text-muted-foreground">
                    {config?.status ?? health?.status ?? 'disconnected'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="page-access-token">Page access token</Label>
                <Input
                  id="page-access-token"
                  type="password"
                  value={pageAccessToken}
                  onChange={(e) => setPageAccessToken(e.target.value)}
                  placeholder={config ? 'leave blank to keep the current token' : 'paste the long-lived page access token'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="verify-token">Webhook verify token</Label>
                <Input
                  id="verify-token"
                  type="password"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  placeholder={config ? 'leave blank to keep the current verify token' : 'paste the Meta webhook verify token'}
                />
              </div>

              <div className="flex items-center justify-between rounded-md border border-border bg-muted/25 p-3">
                <div>
                  <div className="font-medium text-foreground">Webhook subscription</div>
                  <div className="text-sm text-muted-foreground">Keep the subscription enabled so Meta delivers comments and DMs.</div>
                </div>
                <Switch checked={webhookSubscribed} onCheckedChange={setWebhookSubscribed} disabled={!canEditSettings} />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveConfig} disabled={saving || !canEditSettings}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Instagram config</>}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keyword links</CardTitle>
          <CardDescription>Match words like “PRICE” or “BUY” to a WhatsApp prefill message and optional reply.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="keyword">Keyword</Label>
              <Input id="keyword" value={keywordDraft.keyword} onChange={(e) => setKeywordDraft((prev) => ({ ...prev, keyword: e.target.value }))} placeholder="PRICE" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-type">Source</Label>
              <select
                id="source-type"
                value={keywordDraft.source_type}
                onChange={(e) => setKeywordDraft((prev) => ({ ...prev, source_type: e.target.value as SourceType }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="both">Comments + DMs</option>
                <option value="comment">Comments only</option>
                <option value="dm">DMs only</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="prefill-message">WhatsApp prefill message</Label>
              <Input id="prefill-message" value={keywordDraft.wa_prefill_message} onChange={(e) => setKeywordDraft((prev) => ({ ...prev, wa_prefill_message: e.target.value }))} placeholder="BUY SKU123" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="reply-text">Reply text</Label>
              <Textarea id="reply-text" value={keywordDraft.reply_text} onChange={(e) => setKeywordDraft((prev) => ({ ...prev, reply_text: e.target.value }))} placeholder="Here is your link for the product you asked about." />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border bg-muted/25 p-3">
            <div>
              <div className="font-medium text-foreground">Active</div>
              <div className="text-sm text-muted-foreground">Toggle this keyword off without deleting it.</div>
            </div>
            <Switch checked={keywordDraft.active} onCheckedChange={(checked) => setKeywordDraft((prev) => ({ ...prev, active: checked }))} disabled={!canEditSettings} />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveLink} disabled={linkSaving || !canEditSettings}>
              {linkSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Plus className="mr-2 h-4 w-4" />{editingId ? 'Update keyword' : 'Add keyword'}</>}
            </Button>
          </div>

          <div className="space-y-3">
            {links.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                No keyword links yet. Add the first match to route comments and DMs into WhatsApp.
              </div>
            ) : (
              links.map((link) => (
                <div key={link.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{link.keyword}</span>
                        <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {link.source_type}
                        </span>
                        {!link.active ? <span className="text-xs text-muted-foreground">inactive</span> : null}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{link.wa_prefill_message}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEditLink(link)} disabled={!canEditSettings}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => void handleDeleteLink(link.id)} disabled={!canEditSettings}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {link.reply_text ? <div className="mt-2 text-sm text-muted-foreground">{link.reply_text}</div> : null}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
