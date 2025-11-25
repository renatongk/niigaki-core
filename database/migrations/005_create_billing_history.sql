-- ============================================
-- Migration 005: Create Billing History Table
-- Niigaki Core - Invoice/Payment History
-- ============================================

-- ============================================
-- Invoice status enum
-- ============================================

CREATE TYPE invoice_status AS ENUM (
  'pending',
  'confirmed',
  'overdue',
  'refunded',
  'canceled',
  'failed'
);

-- ============================================
-- Billing History Table
-- ============================================

CREATE TABLE billing_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Tenant reference
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- ASAAS reference
  asaas_payment_id VARCHAR(100),
  asaas_subscription_id VARCHAR(100),
  
  -- Invoice details
  status invoice_status NOT NULL DEFAULT 'pending',
  amount_in_cents INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  
  -- Dates
  due_date DATE NOT NULL,
  payment_date TIMESTAMPTZ,
  
  -- Plan at time of invoice
  plan_id UUID REFERENCES billing_plans(id) ON DELETE SET NULL,
  plan_name VARCHAR(255),
  
  -- Payment details
  billing_type VARCHAR(50),
  invoice_url VARCHAR(500),
  bank_slip_url VARCHAR(500),
  pix_qr_code TEXT,
  
  -- Status tracking
  days_overdue INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_billing_history_tenant_id ON billing_history(tenant_id);
CREATE INDEX idx_billing_history_asaas_payment_id ON billing_history(asaas_payment_id);
CREATE INDEX idx_billing_history_status ON billing_history(status);
CREATE INDEX idx_billing_history_due_date ON billing_history(due_date);
CREATE INDEX idx_billing_history_created_at ON billing_history(created_at);

-- Updated_at trigger
CREATE TRIGGER trigger_billing_history_updated_at
  BEFORE UPDATE ON billing_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE billing_history IS 'History of invoices and payments for tenants';
COMMENT ON COLUMN billing_history.asaas_payment_id IS 'Reference to ASAAS payment/invoice ID';
COMMENT ON COLUMN billing_history.amount_in_cents IS 'Amount in smallest currency unit';
COMMENT ON COLUMN billing_history.plan_name IS 'Snapshot of plan name at invoice time';
