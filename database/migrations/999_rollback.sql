-- ============================================
-- Rollback: Drop All Tables
-- Niigaki Core - Complete Rollback
-- ============================================

-- WARNING: This will delete ALL data. Use with caution!

-- ============================================
-- Drop RLS Policies First
-- ============================================

-- Tenants policies
DROP POLICY IF EXISTS "system_admin_select_tenants" ON tenants;
DROP POLICY IF EXISTS "tenant_member_select_own_tenant" ON tenants;
DROP POLICY IF EXISTS "system_admin_manage_tenants" ON tenants;
DROP POLICY IF EXISTS "tenant_admin_update_own_tenant" ON tenants;

-- Stores policies
DROP POLICY IF EXISTS "tenant_isolation_stores" ON stores;
DROP POLICY IF EXISTS "tenant_admin_manage_stores" ON stores;
DROP POLICY IF EXISTS "store_manager_update_store" ON stores;

-- Users policies
DROP POLICY IF EXISTS "tenant_isolation_users" ON users;
DROP POLICY IF EXISTS "user_update_own_profile" ON users;
DROP POLICY IF EXISTS "tenant_admin_manage_users" ON users;

-- Billing plans policies
DROP POLICY IF EXISTS "anyone_view_public_plans" ON billing_plans;
DROP POLICY IF EXISTS "system_admin_manage_plans" ON billing_plans;

-- Billing history policies
DROP POLICY IF EXISTS "tenant_view_billing_history" ON billing_history;
DROP POLICY IF EXISTS "system_insert_billing_history" ON billing_history;
DROP POLICY IF EXISTS "system_admin_manage_billing" ON billing_history;

-- Audit logs policies
DROP POLICY IF EXISTS "user_view_own_audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "tenant_admin_view_audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "system_insert_audit_logs" ON audit_logs;

-- ============================================
-- Drop Auth Helper Functions
-- ============================================

DROP FUNCTION IF EXISTS auth.tenant_id();
DROP FUNCTION IF EXISTS auth.store_id();
DROP FUNCTION IF EXISTS auth.user_role();
DROP FUNCTION IF EXISTS auth.has_role(TEXT);
DROP FUNCTION IF EXISTS auth.is_system_admin();
DROP FUNCTION IF EXISTS auth.is_tenant_admin();

-- ============================================
-- Drop Tables (in reverse dependency order)
-- ============================================

DROP TABLE IF EXISTS webhook_events CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS billing_history CASCADE;
DROP TABLE IF EXISTS billing_plans CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- ============================================
-- Drop Enum Types
-- ============================================

DROP TYPE IF EXISTS webhook_status;
DROP TYPE IF EXISTS invoice_status;
DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS billing_cycle;
DROP TYPE IF EXISTS billing_status;
DROP TYPE IF EXISTS tenant_status;

-- ============================================
-- Drop Utility Functions
-- ============================================

DROP FUNCTION IF EXISTS update_updated_at_column();

-- ============================================
-- Complete
-- ============================================

-- All Niigaki Core tables, types, and functions have been removed.
