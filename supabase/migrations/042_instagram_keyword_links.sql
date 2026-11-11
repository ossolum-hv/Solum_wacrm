DO $$
BEGIN
  CREATE TYPE instagram_source_type AS ENUM ('comment', 'dm', 'both');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

CREATE TABLE IF NOT EXISTS instagram_keyword_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  wa_prefill_message TEXT NOT NULL,
  source_type instagram_source_type NOT NULL DEFAULT 'both',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  reply_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_instagram_keyword_links_active_keyword
  ON instagram_keyword_links (account_id, lower(keyword))
  WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_instagram_keyword_links_account_id
  ON instagram_keyword_links(account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_keyword_links_active
  ON instagram_keyword_links(account_id, active)
  WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_instagram_keyword_links_product_id
  ON instagram_keyword_links(product_id);

ALTER TABLE instagram_keyword_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view instagram keyword links" ON instagram_keyword_links;
CREATE POLICY "Members can view instagram keyword links" ON instagram_keyword_links
  FOR SELECT USING (
    account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins+ can manage instagram keyword links" ON instagram_keyword_links;
CREATE POLICY "Admins+ can manage instagram keyword links" ON instagram_keyword_links
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

DROP TRIGGER IF EXISTS trigger_instagram_keyword_links_updated_at ON instagram_keyword_links;
CREATE TRIGGER trigger_instagram_keyword_links_updated_at
  BEFORE UPDATE ON instagram_keyword_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
