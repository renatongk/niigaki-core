-- ============================================
-- Seed 001: Default Billing Plans
-- Niigaki Core - Initial Data
-- ============================================

-- ============================================
-- Insert Default Billing Plans
-- ============================================

INSERT INTO billing_plans (
  code,
  name,
  description,
  price_in_cents,
  currency,
  cycle,
  trial_days,
  features,
  limits,
  is_active,
  is_public,
  sort_order
) VALUES 
-- Free/Trial Plan
(
  'free',
  'Gratuito',
  'Plano gratuito para começar a usar o sistema',
  0,
  'BRL',
  'MONTHLY',
  14,
  ARRAY['basic_features', 'email_support'],
  '{"maxStores": 1, "maxUsers": 2, "maxProducts": 50, "storageQuotaMb": 50}'::jsonb,
  true,
  true,
  1
),

-- Starter Plan
(
  'starter',
  'Iniciante',
  'Ideal para pequenos negócios que estão começando',
  4990,
  'BRL',
  'MONTHLY',
  14,
  ARRAY['basic_features', 'email_support', 'reports_basic'],
  '{"maxStores": 1, "maxUsers": 5, "maxProducts": 200, "storageQuotaMb": 200}'::jsonb,
  true,
  true,
  2
),

-- Professional Plan
(
  'professional',
  'Profissional',
  'Para negócios em crescimento que precisam de mais recursos',
  9990,
  'BRL',
  'MONTHLY',
  14,
  ARRAY['basic_features', 'email_support', 'reports_basic', 'reports_advanced', 'api_access', 'priority_support'],
  '{"maxStores": 3, "maxUsers": 15, "maxProducts": 1000, "storageQuotaMb": 1000}'::jsonb,
  true,
  true,
  3
),

-- Business Plan
(
  'business',
  'Empresarial',
  'Solução completa para empresas com múltiplas lojas',
  19990,
  'BRL',
  'MONTHLY',
  14,
  ARRAY['basic_features', 'email_support', 'reports_basic', 'reports_advanced', 'api_access', 'priority_support', 'custom_branding', 'integrations', 'dedicated_support'],
  '{"maxStores": 10, "maxUsers": 50, "maxProducts": 5000, "storageQuotaMb": 5000}'::jsonb,
  true,
  true,
  4
),

-- Enterprise Plan
(
  'enterprise',
  'Enterprise',
  'Para grandes empresas com necessidades personalizadas',
  49990,
  'BRL',
  'MONTHLY',
  30,
  ARRAY['basic_features', 'email_support', 'reports_basic', 'reports_advanced', 'api_access', 'priority_support', 'custom_branding', 'integrations', 'dedicated_support', 'sla', 'custom_development', 'training'],
  '{"maxStores": -1, "maxUsers": -1, "maxProducts": -1, "storageQuotaMb": -1}'::jsonb,
  true,
  false,
  5
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_in_cents = EXCLUDED.price_in_cents,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  is_active = EXCLUDED.is_active,
  is_public = EXCLUDED.is_public,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE billing_plans IS 'Note: -1 in limits means unlimited';
