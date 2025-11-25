-- ============================================
-- Migration 001: Create Tenants Table
-- Niigaki Core - Multi-tenant Foundation
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Enum Types
-- ============================================

-- Tenant status enum
CREATE TYPE tenant_status AS ENUM (
  'active',
  'inactive',
  'suspended',
  'pending'
);

-- Billing status enum
CREATE TYPE billing_status AS ENUM (
  'trial',
  'active',
  'pending_payment',
  'overdue',
  'suspended',
  'canceled'
);

-- Billing cycle enum
CREATE TYPE billing_cycle AS ENUM (
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'SEMIANNUALLY',
  'YEARLY'
);

-- ============================================
-- Tenants Table
-- ============================================

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  status tenant_status NOT NULL DEFAULT 'pending',
  
  -- Billing Integration (ASAAS)
  asaas_customer_id VARCHAR(100),
  asaas_subscription_id VARCHAR(100),
  billing_status billing_status NOT NULL DEFAULT 'pending_payment',
  
  -- Contact Information
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  
  -- Address (for billing)
  address VARCHAR(500),
  address_number VARCHAR(20),
  postal_code VARCHAR(20),
  city VARCHAR(100),
  province VARCHAR(50),
  
  -- Tax identification
  cpf_cnpj VARCHAR(20),
  
  -- Settings (JSONB for flexibility)
  settings JSONB NOT NULL DEFAULT '{
    "features": [],
    "limits": {
      "maxStores": 1,
      "maxUsers": 5,
      "maxProducts": 100,
      "storageQuotaMb": 100
    },
    "custom": {}
  }'::jsonb,
  
  -- Subscription metadata
  subscription_metadata JSONB DEFAULT NULL,
  
  -- Branding
  branding JSONB DEFAULT NULL,
  
  -- Additional metadata
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_slug CHECK (slug ~* '^[a-z0-9]+(-[a-z0-9]+)*$')
);

-- Indexes
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_billing_status ON tenants(billing_status);
CREATE INDEX idx_tenants_asaas_customer_id ON tenants(asaas_customer_id);
CREATE INDEX idx_tenants_asaas_subscription_id ON tenants(asaas_subscription_id);
CREATE INDEX idx_tenants_created_at ON tenants(created_at);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE tenants IS 'Multi-tenant core table - stores tenant information and billing data';
COMMENT ON COLUMN tenants.slug IS 'URL-friendly unique identifier for the tenant';
COMMENT ON COLUMN tenants.asaas_customer_id IS 'ASAAS payment platform customer ID';
COMMENT ON COLUMN tenants.asaas_subscription_id IS 'ASAAS payment platform subscription ID';
COMMENT ON COLUMN tenants.settings IS 'Tenant settings including features, limits, and custom configurations';
COMMENT ON COLUMN tenants.subscription_metadata IS 'Billing subscription metadata (plan, dates, etc.)';
