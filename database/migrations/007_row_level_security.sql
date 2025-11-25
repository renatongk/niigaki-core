-- ============================================
-- Migration 007: Row Level Security Policies
-- Niigaki Core - Supabase RLS
-- ============================================

-- ============================================
-- Enable RLS on all tables
-- ============================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Helper Functions for RLS
-- ============================================

-- Get current user's tenant_id from JWT
CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get current user's store_id from JWT
CREATE OR REPLACE FUNCTION auth.store_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'store_id')::uuid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get current user's role from JWT
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN auth.jwt() -> 'app_metadata' ->> 'role';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION auth.has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_roles TEXT[];
BEGIN
  user_roles := ARRAY(
    SELECT jsonb_array_elements_text(auth.jwt() -> 'app_metadata' -> 'roles')
  );
  RETURN required_role = ANY(user_roles) OR 'system_admin' = ANY(user_roles);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user is system admin
CREATE OR REPLACE FUNCTION auth.is_system_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.has_role('system_admin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user is tenant admin
CREATE OR REPLACE FUNCTION auth.is_tenant_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.has_role('tenant_admin') OR auth.is_system_admin();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- Tenants Policies
-- ============================================

-- System admins can see all tenants
CREATE POLICY "system_admin_select_tenants" ON tenants
  FOR SELECT
  TO authenticated
  USING (auth.is_system_admin());

-- Users can see their own tenant
CREATE POLICY "tenant_member_select_own_tenant" ON tenants
  FOR SELECT
  TO authenticated
  USING (id = auth.tenant_id());

-- System admins can manage all tenants
CREATE POLICY "system_admin_manage_tenants" ON tenants
  FOR ALL
  TO authenticated
  USING (auth.is_system_admin())
  WITH CHECK (auth.is_system_admin());

-- Tenant admins can update their own tenant
CREATE POLICY "tenant_admin_update_own_tenant" ON tenants
  FOR UPDATE
  TO authenticated
  USING (id = auth.tenant_id() AND auth.is_tenant_admin())
  WITH CHECK (id = auth.tenant_id() AND auth.is_tenant_admin());

-- ============================================
-- Stores Policies
-- ============================================

-- Users can only see stores from their tenant
CREATE POLICY "tenant_isolation_stores" ON stores
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = auth.tenant_id()
    OR auth.is_system_admin()
  );

-- Tenant admins can manage stores
CREATE POLICY "tenant_admin_manage_stores" ON stores
  FOR ALL
  TO authenticated
  USING (
    (tenant_id = auth.tenant_id() AND auth.is_tenant_admin())
    OR auth.is_system_admin()
  )
  WITH CHECK (
    (tenant_id = auth.tenant_id() AND auth.is_tenant_admin())
    OR auth.is_system_admin()
  );

-- Store managers can update their store
CREATE POLICY "store_manager_update_store" ON stores
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.store_id()
    AND tenant_id = auth.tenant_id()
    AND auth.has_role('store_manager')
  )
  WITH CHECK (
    id = auth.store_id()
    AND tenant_id = auth.tenant_id()
    AND auth.has_role('store_manager')
  );

-- ============================================
-- Users Policies
-- ============================================

-- Users can see users from their tenant
CREATE POLICY "tenant_isolation_users" ON users
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = auth.tenant_id()
    OR auth.is_system_admin()
    OR id = auth.uid()
  );

-- Users can update their own profile
CREATE POLICY "user_update_own_profile" ON users
  FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- Tenant admins can manage users in their tenant
CREATE POLICY "tenant_admin_manage_users" ON users
  FOR ALL
  TO authenticated
  USING (
    (tenant_id = auth.tenant_id() AND auth.is_tenant_admin())
    OR auth.is_system_admin()
  )
  WITH CHECK (
    (tenant_id = auth.tenant_id() AND auth.is_tenant_admin())
    OR auth.is_system_admin()
  );

-- ============================================
-- Billing Plans Policies
-- ============================================

-- Everyone can view active public plans
CREATE POLICY "anyone_view_public_plans" ON billing_plans
  FOR SELECT
  TO authenticated
  USING (is_active = true AND is_public = true);

-- System admins can manage all plans
CREATE POLICY "system_admin_manage_plans" ON billing_plans
  FOR ALL
  TO authenticated
  USING (auth.is_system_admin())
  WITH CHECK (auth.is_system_admin());

-- ============================================
-- Billing History Policies
-- ============================================

-- Users can view their tenant's billing history
CREATE POLICY "tenant_view_billing_history" ON billing_history
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = auth.tenant_id()
    OR auth.is_system_admin()
  );

-- Only system processes can insert billing history
CREATE POLICY "system_insert_billing_history" ON billing_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.is_system_admin());

-- System admins can manage billing history
CREATE POLICY "system_admin_manage_billing" ON billing_history
  FOR ALL
  TO authenticated
  USING (auth.is_system_admin())
  WITH CHECK (auth.is_system_admin());

-- ============================================
-- Audit Logs Policies
-- ============================================

-- Users can view their own actions
CREATE POLICY "user_view_own_audit_logs" ON audit_logs
  FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Tenant admins can view all audit logs for their tenant
CREATE POLICY "tenant_admin_view_audit_logs" ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    (tenant_id = auth.tenant_id() AND auth.is_tenant_admin())
    OR auth.is_system_admin()
  );

-- Only system can insert audit logs (through service role)
CREATE POLICY "system_insert_audit_logs" ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.is_system_admin());

-- ============================================
-- Comments
-- ============================================

COMMENT ON FUNCTION auth.tenant_id() IS 'Extract tenant_id from JWT app_metadata';
COMMENT ON FUNCTION auth.store_id() IS 'Extract store_id from JWT app_metadata';
COMMENT ON FUNCTION auth.user_role() IS 'Extract user role from JWT app_metadata';
COMMENT ON FUNCTION auth.has_role(TEXT) IS 'Check if user has a specific role';
COMMENT ON FUNCTION auth.is_system_admin() IS 'Check if user is a system administrator';
COMMENT ON FUNCTION auth.is_tenant_admin() IS 'Check if user is a tenant administrator';
