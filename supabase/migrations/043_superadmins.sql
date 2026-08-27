-- Superadmins table (platform-level, outside account tenancy)
-- Only platform superadmins can create/manage accounts and users

CREATE TABLE IF NOT EXISTS superadmins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies for superadmins table
ALTER TABLE superadmins ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for bootstrap and admin APIs)
CREATE POLICY "Service role full access"
  ON superadmins
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Superadmins can read all superadmins
CREATE POLICY "Superadmins can read"
  ON superadmins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM superadmins sa
      WHERE sa.user_id = auth.uid()
    )
  );

-- Superadmins can insert new superadmins
CREATE POLICY "Superadmins can insert"
  ON superadmins
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM superadmins sa
      WHERE sa.user_id = auth.uid()
    )
  );

-- Superadmins can delete superadmins (except themselves)
CREATE POLICY "Superadmins can delete"
  ON superadmins
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM superadmins sa
      WHERE sa.user_id = auth.uid()
      AND sa.user_id <> superadmins.user_id
    )
  );

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_superadmins_user_id ON superadmins(user_id);

-- Comment
COMMENT ON TABLE superadmins IS 'Platform superadmins who can create/manage accounts and users. Outside account tenancy.';