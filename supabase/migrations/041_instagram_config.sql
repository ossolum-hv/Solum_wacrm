-- ============================================================
-- 041_instagram_config.sql
-- Instagram Business Account configuration (per account/tenant)
-- Mirrors whatsapp_config pattern: encrypted tokens, webhook verification
-- ============================================================

CREATE TABLE IF NOT EXISTS instagram_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Instagram Business Account identifiers
  ig_business_id TEXT NOT NULL,           -- Instagram Business Account ID (IGID)
  ig_username TEXT NOT NULL,              -- Human-readable @handle
  page_id TEXT NOT NULL,                  -- Facebook Page ID backing the IG Business Account
  
  -- Encrypted tokens (AES-256-GCM, same as whatsapp_config)
  page_access_token TEXT NOT NULL,        -- Page access token with instagram_manage_messages
  verify_token TEXT NOT NULL,             -- Webhook verification token (set during OAuth)
  
  -- Connection state
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'expired')),
  webhook_subscribed BOOLEAN NOT NULL DEFAULT FALSE,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One Instagram Business Account per account_id
  UNIQUE(account_id, ig_business_id)
);

CREATE INDEX IF NOT EXISTS idx_instagram_config_account_id ON instagram_config(account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_config_ig_business_id ON instagram_config(ig_business_id);

ALTER TABLE instagram_config ENABLE ROW LEVEL SECURITY;

-- Members can view their account's Instagram connections
DROP POLICY IF EXISTS "Members can view instagram config" ON instagram_config;
CREATE POLICY "Members can view instagram config" ON instagram_config
  FOR SELECT USING (
    account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid())
  );

-- Admins+ can manage Instagram connections
DROP POLICY IF EXISTS "Admins+ can manage instagram config" ON instagram_config;
CREATE POLICY "Admins+ can manage instagram config" ON instagram_config
  FOR ALL USING (
    account_id IN (
      SELECT account_id FROM profiles 
      WHERE user_id = auth.uid() AND account_role IN ('owner','admin','agent')
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM profiles 
      WHERE user_id = auth.uid() AND account_role IN ('owner','admin','agent')
    )
  );

-- Updated at trigger
DROP TRIGGER IF EXISTS trigger_instagram_config_updated_at ON instagram_config;
CREATE TRIGGER trigger_instagram_config_updated_at
  BEFORE UPDATE ON instagram_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();