-- ============================================
-- Migration 008: Webhook Events Table
-- Niigaki Core - ASAAS Webhook Processing
-- ============================================

-- ============================================
-- Webhook processing status enum
-- ============================================

CREATE TYPE webhook_status AS ENUM (
  'pending',
  'processing',
  'processed',
  'failed',
  'ignored'
);

-- ============================================
-- Webhook Events Table
-- ============================================

CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Source identification
  source VARCHAR(50) NOT NULL DEFAULT 'asaas',
  external_id VARCHAR(255),
  
  -- Event details
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  
  -- Processing status
  status webhook_status NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  
  -- Processing details
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  result JSONB,
  
  -- Related entities (populated after processing)
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_external_event UNIQUE (source, external_id)
);

-- Indexes
CREATE INDEX idx_webhook_events_source ON webhook_events(source);
CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_tenant_id ON webhook_events(tenant_id);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at);

-- Index for pending events that need processing
CREATE INDEX idx_webhook_events_pending 
  ON webhook_events(status, attempts, created_at) 
  WHERE status IN ('pending', 'failed') AND attempts < max_attempts;

-- Updated_at trigger
CREATE TRIGGER trigger_webhook_events_updated_at
  BEFORE UPDATE ON webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE webhook_events IS 'Stores incoming webhook events for processing';
COMMENT ON COLUMN webhook_events.source IS 'Webhook source (e.g., asaas, stripe)';
COMMENT ON COLUMN webhook_events.external_id IS 'External event ID for deduplication';
COMMENT ON COLUMN webhook_events.attempts IS 'Number of processing attempts';
COMMENT ON COLUMN webhook_events.max_attempts IS 'Maximum retry attempts before marking as failed';
