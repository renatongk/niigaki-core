-- ============================================
-- Migration 006: Create Audit Log Table
-- Niigaki Core - Audit Trail
-- ============================================

-- ============================================
-- Audit Log Table
-- ============================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Context
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  
  -- Correlation
  correlation_id VARCHAR(100),
  session_id VARCHAR(100),
  
  -- Action details
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  
  -- Change details
  old_values JSONB,
  new_values JSONB,
  
  -- Request context
  ip_address INET,
  user_agent TEXT,
  request_method VARCHAR(10),
  request_path VARCHAR(500),
  
  -- Result
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Timestamp (no updated_at as logs are immutable)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_correlation_id ON audit_logs(correlation_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_success ON audit_logs(success);

-- Composite index for common queries
CREATE INDEX idx_audit_logs_tenant_action_created 
  ON audit_logs(tenant_id, action, created_at DESC);

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE audit_logs IS 'Immutable audit trail for all system actions';
COMMENT ON COLUMN audit_logs.correlation_id IS 'Request correlation ID for log tracing';
COMMENT ON COLUMN audit_logs.old_values IS 'Previous values before the change';
COMMENT ON COLUMN audit_logs.new_values IS 'New values after the change';

-- ============================================
-- Partition by month for better performance
-- (Optional - uncomment for large-scale deployments)
-- ============================================

-- Example partition setup (adjust dates as needed):
-- CREATE TABLE audit_logs (
--   ...
-- ) PARTITION BY RANGE (created_at);
-- 
-- -- Create partitions for each month:
-- CREATE TABLE audit_logs_yYYYYmMM PARTITION OF audit_logs
--   FOR VALUES FROM ('YYYY-MM-01') TO ('YYYY-MM+1-01');
