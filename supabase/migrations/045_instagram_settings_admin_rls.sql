DROP POLICY IF EXISTS "Admins+ can manage instagram config" ON instagram_config;
CREATE POLICY "Admins can manage instagram config" ON instagram_config
  FOR ALL USING (
    account_id IN (
      SELECT account_id FROM profiles
      WHERE user_id = auth.uid() AND account_role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM profiles
      WHERE user_id = auth.uid() AND account_role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins+ can manage instagram keyword links" ON instagram_keyword_links;
CREATE POLICY "Admins can manage instagram keyword links" ON instagram_keyword_links
  FOR ALL USING (
    account_id IN (
      SELECT account_id FROM profiles
      WHERE user_id = auth.uid() AND account_role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM profiles
      WHERE user_id = auth.uid() AND account_role IN ('owner', 'admin')
    )
  );
