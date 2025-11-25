# Database Scripts - @niigaki/core

This directory contains SQL scripts for setting up the database schema used by the Niigaki Core library.

## Structure

```
database/
├── migrations/           # Schema migrations (run in order)
│   ├── 001_create_tenants.sql
│   ├── 002_create_stores.sql
│   ├── 003_create_users.sql
│   ├── 004_create_billing_plans.sql
│   ├── 005_create_billing_history.sql
│   ├── 006_create_audit_logs.sql
│   ├── 007_row_level_security.sql
│   └── 008_create_webhook_events.sql
├── seeds/                # Initial data
│   └── 001_billing_plans.sql
└── README.md
```

## Prerequisites

- PostgreSQL 14+ (recommended)
- Supabase project (for RLS and auth functions)

## Running Migrations

### Using Supabase CLI

```bash
# Run all migrations
supabase db push

# Or run specific migration
supabase db execute --file database/migrations/001_create_tenants.sql
```

### Using psql

```bash
# Connect to your database
psql -h <host> -U <user> -d <database>

# Run migrations in order
\i database/migrations/001_create_tenants.sql
\i database/migrations/002_create_stores.sql
\i database/migrations/003_create_users.sql
\i database/migrations/004_create_billing_plans.sql
\i database/migrations/005_create_billing_history.sql
\i database/migrations/006_create_audit_logs.sql
\i database/migrations/007_row_level_security.sql
\i database/migrations/008_create_webhook_events.sql

# Run seeds
\i database/seeds/001_billing_plans.sql
```

### Using Migration Script

```bash
# All at once
cat database/migrations/*.sql | psql -h <host> -U <user> -d <database>
```

## Schema Overview

### Core Tables

| Table | Description |
|-------|-------------|
| `tenants` | Multi-tenant organizations with billing integration |
| `stores` | Stores within each tenant |
| `users` | User accounts with roles and permissions |
| `billing_plans` | Available subscription plans |
| `billing_history` | Invoice and payment records |
| `audit_logs` | System audit trail |
| `webhook_events` | Incoming webhook event queue |

### Enum Types

| Enum | Values |
|------|--------|
| `tenant_status` | active, inactive, suspended, pending |
| `billing_status` | trial, active, pending_payment, overdue, suspended, canceled |
| `billing_cycle` | WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, SEMIANNUALLY, YEARLY |
| `user_role` | system_admin, app_admin, tenant_admin, store_manager, store_employee |
| `invoice_status` | pending, confirmed, overdue, refunded, canceled, failed |
| `webhook_status` | pending, processing, processed, failed, ignored |

## Row Level Security (RLS)

The `007_row_level_security.sql` migration sets up Supabase RLS policies for multi-tenant isolation:

### Helper Functions

- `auth.tenant_id()` - Get current user's tenant ID from JWT
- `auth.store_id()` - Get current user's store ID from JWT
- `auth.user_role()` - Get current user's role from JWT
- `auth.has_role(role)` - Check if user has a specific role
- `auth.is_system_admin()` - Check if user is system admin
- `auth.is_tenant_admin()` - Check if user is tenant admin

### Policy Summary

| Table | Read | Write |
|-------|------|-------|
| tenants | Own tenant + System Admin | Tenant Admin (own) + System Admin |
| stores | Own tenant + System Admin | Tenant Admin + Store Manager (own) |
| users | Own tenant + System Admin | Own profile + Tenant Admin |
| billing_plans | Public plans (all) | System Admin only |
| billing_history | Own tenant | System Admin only |
| audit_logs | Own actions + Tenant Admin (tenant) | System Admin only |

## JWT Claims Structure

The RLS policies expect the following JWT structure:

```json
{
  "sub": "user-uuid",
  "app_metadata": {
    "tenant_id": "tenant-uuid",
    "store_id": "store-uuid",
    "role": "store_manager",
    "roles": ["store_manager", "store_employee"]
  }
}
```

## Integration with @niigaki/core

The database schema is designed to work with the `@niigaki/core` library:

```typescript
import { 
  BillingStatus, 
  BillingCycle,
  Role,
  TenantStatus 
} from '@niigaki/core';

// TypeScript enums match database enums
const tenant = {
  billing_status: BillingStatus.ACTIVE, // 'active'
  status: TenantStatus.ACTIVE,           // 'active'
};

const plan = {
  cycle: BillingCycle.MONTHLY, // 'MONTHLY'
};
```

## Customization

### Adding Custom Fields

Add custom fields to the `metadata` JSONB column:

```sql
UPDATE tenants 
SET metadata = metadata || '{"custom_field": "value"}'::jsonb
WHERE id = 'tenant-id';
```

### Extending Settings

The `settings` JSONB column supports custom configurations:

```sql
UPDATE tenants 
SET settings = jsonb_set(
  settings, 
  '{custom}', 
  '{"theme": "dark", "locale": "pt-BR"}'::jsonb
)
WHERE id = 'tenant-id';
```

## Backup & Recovery

```bash
# Backup
pg_dump -h <host> -U <user> -d <database> > backup.sql

# Restore
psql -h <host> -U <user> -d <database> < backup.sql
```

## License

MIT © Niigaki Software House
