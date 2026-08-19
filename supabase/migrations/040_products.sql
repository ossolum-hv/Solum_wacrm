-- ============================================================
-- 040_products.sql
-- Products & Orders for WhatsApp CRM
-- ============================================================

-- Enable UUID extension (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('digital', 'physical')),
  
  -- Pricing
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- Digital product fields
  digital_file_url TEXT,
  digital_file_name TEXT,
  
  -- Physical product fields
  sku TEXT,
  weight_grams INTEGER,
  requires_shipping BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Common
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_account_id ON products(account_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(account_id, is_active) WHERE is_active = TRUE;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view account products" ON products;
CREATE POLICY "Members can view account products" ON products
  FOR SELECT USING (
    account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Agents+ can manage products" ON products;
CREATE POLICY "Agents+ can manage products" ON products
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

-- ============================================================
-- ORDERS / SALES
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  
  -- Pricing snapshot (immutable)
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  
  -- Payment
  status TEXT NOT NULL CHECK (status IN ('pending','paid','failed','refunded','cancelled')) DEFAULT 'pending',
  payment_provider TEXT,
  payment_intent_id TEXT,
  payment_url TEXT,
  paid_at TIMESTAMPTZ,
  
  -- Fulfillment
  fulfillment_status TEXT NOT NULL CHECK (fulfillment_status IN ('pending','fulfilled','shipped','delivered','failed')) DEFAULT 'pending',
  fulfillment_notes TEXT,
  fulfilled_at TIMESTAMPTZ,
  
  -- Meta
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_account_id ON orders(account_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_contact_id ON orders(contact_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(account_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(account_id, created_at DESC);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view account orders" ON orders;
CREATE POLICY "Members can view account orders" ON orders
  FOR SELECT USING (
    account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Agents+ can manage orders" ON orders;
CREATE POLICY "Agents+ can manage orders" ON orders
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

-- ============================================================
-- TRIGGER: auto-set account_id from product on insert
-- ============================================================
CREATE OR REPLACE FUNCTION set_order_account_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT account_id INTO NEW.account_id FROM products WHERE id = NEW.product_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trigger_set_order_account_id ON orders;
CREATE TRIGGER trigger_set_order_account_id
BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION set_order_account_id();

-- ============================================================
-- UPDATED_AT TRIGGERS (reuse existing pattern)
-- ============================================================
-- Products updated_at
DROP TRIGGER IF EXISTS trigger_products_updated_at ON products;
CREATE TRIGGER trigger_products_updated_at
BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Orders updated_at
DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders;
CREATE TRIGGER trigger_orders_updated_at
BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();