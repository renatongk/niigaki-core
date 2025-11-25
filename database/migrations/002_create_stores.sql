-- ============================================
-- Migration 002: Create Stores Table
-- Niigaki Core - Multi-store Support
-- ============================================

-- ============================================
-- Stores Table
-- ============================================

CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Store status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Contact information
  email VARCHAR(255),
  phone VARCHAR(50),
  
  -- Address
  address VARCHAR(500),
  address_number VARCHAR(20),
  postal_code VARCHAR(20),
  city VARCHAR(100),
  province VARCHAR(50),
  country VARCHAR(50) DEFAULT 'BR',
  
  -- Operational settings
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_store_slug_per_tenant UNIQUE (tenant_id, slug)
);

-- Indexes
CREATE INDEX idx_stores_tenant_id ON stores(tenant_id);
CREATE INDEX idx_stores_slug ON stores(slug);
CREATE INDEX idx_stores_is_active ON stores(is_active);
CREATE INDEX idx_stores_created_at ON stores(created_at);

-- Updated_at trigger
CREATE TRIGGER trigger_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE stores IS 'Stores within a tenant - supports multi-store scenarios';
COMMENT ON COLUMN stores.tenant_id IS 'Foreign key to tenants table';
COMMENT ON COLUMN stores.slug IS 'URL-friendly identifier unique within the tenant';
