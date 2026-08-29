-- ============================================================
-- Leads table for book demo requests
-- ============================================================

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact info
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,

  -- Company info
  company_name TEXT NOT NULL,
  industry TEXT,
  team_size TEXT,

  -- Additional context
  message TEXT,

  -- Metadata
  source TEXT DEFAULT 'book-demo',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Status tracking
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  assigned_to_user_id UUID REFERENCES auth.users(id),
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_contacted_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_leads_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_timestamp();

-- RLS policies
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public form submission)
CREATE POLICY "Public can insert leads" ON leads
  FOR INSERT
  WITH CHECK (true);

-- Users can view leads assigned to them or unassigned
CREATE POLICY "Users can view their leads" ON leads
  FOR SELECT
  USING (
    assigned_to_user_id = auth.uid()
    OR assigned_to_user_id IS NULL
    OR EXISTS (
      SELECT 1 FROM superadmins WHERE user_id = auth.uid()
    )
  );

-- Users can update leads assigned to them
CREATE POLICY "Users can update their leads" ON leads
  FOR UPDATE
  USING (assigned_to_user_id = auth.uid());

-- Indexes
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_source ON leads(source);

-- Comments
COMMENT ON TABLE leads IS 'Book demo and other marketing lead captures';
COMMENT ON COLUMN leads.status IS 'new, contacted, qualified, converted, lost';
