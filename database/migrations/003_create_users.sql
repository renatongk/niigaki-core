-- ============================================
-- Migration 003: Create Users Table
-- Niigaki Core - User Management
-- ============================================

-- ============================================
-- Enum Types
-- ============================================

-- User role enum (matches RBAC in auth module)
CREATE TYPE user_role AS ENUM (
  'system_admin',
  'app_admin',
  'tenant_admin',
  'store_manager',
  'store_employee'
);

-- ============================================
-- Users Table
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Tenant association (nullable for system admins)
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Store association (optional - for store-level users)
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  
  -- Auth provider ID (e.g., Supabase auth.users id)
  auth_id UUID UNIQUE,
  
  -- User information
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  
  -- Role and permissions
  role user_role NOT NULL DEFAULT 'store_employee',
  permissions TEXT[] DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  
  -- Profile
  phone VARCHAR(50),
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Timestamps
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_user_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_store_id ON users(store_id);
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Updated_at trigger
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE users IS 'User accounts with tenant and role associations';
COMMENT ON COLUMN users.auth_id IS 'Reference to external auth provider (e.g., Supabase auth.users.id)';
COMMENT ON COLUMN users.tenant_id IS 'Tenant this user belongs to (null for system admins)';
COMMENT ON COLUMN users.store_id IS 'Store this user is assigned to (optional)';
COMMENT ON COLUMN users.permissions IS 'Additional permissions beyond role-based';
