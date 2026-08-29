-- ============================================================
-- Add account_id to leads table for account-based permissions
-- ============================================================

-- Add account_id column
ALTER TABLE leads ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id);

-- Create index for account_id lookups
CREATE INDEX IF NOT EXISTS idx_leads_account_id ON leads(account_id);

-- Drop old RLS policies that reference superadmins
DROP POLICY IF EXISTS "Users can view their leads" ON leads;
DROP POLICY IF EXISTS "Users can update their leads" ON leads;

-- New RLS policies using account-based permissions
-- Admins+ in the account can view all leads in their account
CREATE POLICY "Account admins can view leads" ON leads
  FOR SELECT
  USING (
    account_id IS NOT NULL AND
    is_account_member(account_id, 'admin')
  );

-- Admins+ in the account can update leads in their account
CREATE POLICY "Account admins can update leads" ON leads
  FOR UPDATE
  USING (
    account_id IS NOT NULL AND
    is_account_member(account_id, 'admin')
  );

-- Agents can view leads in their account (read access for operational roles)
CREATE POLICY "Account agents can view leads" ON leads
  FOR SELECT
  USING (
    account_id IS NOT NULL AND
    is_account_member(account_id, 'agent')
  );

-- Service role can always insert (public form submissions)
-- This policy already exists: "Public can insert leads"

-- Comment
COMMENT ON COLUMN leads.account_id IS 'Account that owns this lead';