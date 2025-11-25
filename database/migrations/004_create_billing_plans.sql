-- ============================================
-- Migration 004: Create Billing Plans Table
-- Niigaki Core - Billing Plans Management
-- ============================================

-- ============================================
-- Billing Plans Table
-- ============================================

CREATE TABLE billing_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Plan identification
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Pricing
  price_in_cents INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  cycle billing_cycle NOT NULL DEFAULT 'MONTHLY',
  
  -- Trial
  trial_days INTEGER NOT NULL DEFAULT 0,
  
  -- Features and limits
  features TEXT[] DEFAULT '{}',
  limits JSONB NOT NULL DEFAULT '{
    "maxStores": 1,
    "maxUsers": 5,
    "maxProducts": 100,
    "storageQuotaMb": 100
  }'::jsonb,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT true,
  
  -- Display order
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT positive_price CHECK (price_in_cents >= 0),
  CONSTRAINT positive_trial CHECK (trial_days >= 0)
);

-- Indexes
CREATE INDEX idx_billing_plans_code ON billing_plans(code);
CREATE INDEX idx_billing_plans_is_active ON billing_plans(is_active);
CREATE INDEX idx_billing_plans_is_public ON billing_plans(is_public);
CREATE INDEX idx_billing_plans_sort_order ON billing_plans(sort_order);

-- Updated_at trigger
CREATE TRIGGER trigger_billing_plans_updated_at
  BEFORE UPDATE ON billing_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE billing_plans IS 'Available subscription plans for tenants';
COMMENT ON COLUMN billing_plans.code IS 'Unique plan identifier for API use';
COMMENT ON COLUMN billing_plans.price_in_cents IS 'Price in smallest currency unit to avoid float issues';
COMMENT ON COLUMN billing_plans.features IS 'Array of feature flags included in this plan';
COMMENT ON COLUMN billing_plans.limits IS 'Resource limits for this plan. Use -1 for unlimited';
