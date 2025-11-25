# @niigaki/core

> Foundation library for Niigaki Software House - Authentication, Logging, Multi-tenancy, and Utilities

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Overview

`@niigaki/core` is the foundational library used across all Niigaki Software House products. It provides:

- 🔐 **Authentication Engine** - RBAC and ABAC for flexible access control
- 🎫 **JWT Claims** - Standardized token generation for Supabase
- 🏢 **Multi-tenant Support** - Context management and helpers for SaaS
- 📝 **Universal Logging** - Structured logging with correlation IDs
- 🌐 **HTTP Client** - Standardized API client with interceptors
- 🛠️ **Utilities** - Common validation, date, and math functions

## Installation

```bash
npm install @niigaki/core
```

## Quick Start

```typescript
import {
  logger,
  rbac,
  abac,
  tenantContext,
  httpClient,
  createLogContext,
  Role,
  Action,
  LogLevel,
} from '@niigaki/core';

// Configure logging
logger.configure({
  minLevel: LogLevel.INFO,
  jsonFormat: process.env.NODE_ENV === 'production',
});

// Check permissions with RBAC
if (rbac.can(Role.STORE_MANAGER, Action.MANAGE_PRODUCTS)) {
  // Allow product management
}

// Check policies with ABAC
const result = abac.evaluate(resource, user, 'same_tenant');
if (result.allowed) {
  // Access granted
}

// Set tenant context
tenantContext.store.set({
  tenant: currentTenant,
  storeId: 'store-123',
});

// Log operations
const ctx = createLogContext({ tenantId: 'tenant-1' });
logger.start('processOrder', ctx);
// ... do work ...
logger.end('processOrder', ctx);
```

## Modules

### Authentication (`auth/`)

Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC):

```typescript
import { Role, Action, can, abac } from '@niigaki/core';

// RBAC
can(Role.TENANT_ADMIN, Action.MANAGE_STORES); // true

// ABAC
const result = abac.evaluate(resource, user, 'same_tenant');
```

See [Auth Engine Guide](docs/auth-engine.md) for details.

### Logging (`logging/`)

Universal logging with correlation IDs:

```typescript
import { logger, createLogContext } from '@niigaki/core';

const ctx = createLogContext({ userId: 'user-123' });
logger.start('operation', ctx);
logger.info('operation', 'Processing...', ctx);
logger.end('operation', ctx);
```

See [Logging Guide](docs/logging-guide.md) for details.

### Multi-tenancy (`tenancy/`)

Tenant context management and helpers:

```typescript
import {
  tenantContextStore,
  assertTenantScope,
  filterByTenant,
} from '@niigaki/core';

tenantContextStore.set({ tenant, storeId: 'store-1' });
assertTenantScope(resource.tenant_id);
const filtered = filterByTenant(resources);
```

See [Tenancy Guide](docs/tenancy-guide.md) for details.

### HTTP Client (`api/`)

Standardized HTTP client with interceptors:

```typescript
import { httpClient, createHttpClient, AppError } from '@niigaki/core';

const client = createHttpClient({
  baseUrl: 'https://api.example.com',
});

const response = await client.get<User>('/users/123');
```

See [HTTP Client Guide](docs/http-client-guide.md) for details.

### Utilities (`utils/`)

Common helper functions:

```typescript
import { validation, dates, math } from '@niigaki/core';

validation.isValidEmail('test@example.com'); // true
dates.formatRelative(new Date()); // "just now"
math.formatCurrency(99.99, 'USD'); // "$99.99"
```

## API Reference

### Roles

```typescript
enum Role {
  SYSTEM_ADMIN = 'system_admin',
  APP_ADMIN = 'app_admin',
  TENANT_ADMIN = 'tenant_admin',
  STORE_MANAGER = 'store_manager',
  STORE_EMPLOYEE = 'store_employee',
}
```

### Actions

```typescript
enum Action {
  MANAGE_SYSTEM, VIEW_SYSTEM_LOGS,
  MANAGE_TENANTS, VIEW_TENANTS, CREATE_TENANT, DELETE_TENANT,
  MANAGE_STORES, VIEW_STORES, CREATE_STORE, DELETE_STORE,
  MANAGE_USERS, VIEW_USERS, CREATE_USER, DELETE_USER,
  MANAGE_PRODUCTS, VIEW_PRODUCTS, CREATE_PRODUCT, DELETE_PRODUCT,
  MANAGE_ORDERS, VIEW_ORDERS, CREATE_ORDER, CANCEL_ORDER,
  VIEW_REPORTS, EXPORT_REPORTS,
  MANAGE_SETTINGS, VIEW_SETTINGS,
}
```

### Error Codes

```typescript
enum ErrorCode {
  BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT,
  VALIDATION_ERROR, RATE_LIMITED, INTERNAL_ERROR,
  SERVICE_UNAVAILABLE, TIMEOUT,
  TENANT_NOT_FOUND, STORE_NOT_FOUND, USER_NOT_FOUND,
  PERMISSION_DENIED, INVALID_OPERATION,
}
```

## Documentation

- [Core Architecture](docs/core-architecture.md)
- [Auth Engine Guide](docs/auth-engine.md)
- [Logging Guide](docs/logging-guide.md)
- [Tenancy Guide](docs/tenancy-guide.md)
- [HTTP Client Guide](docs/http-client-guide.md)
- [Billing Overview](docs/billing-overview.md)
- [Billing Flows](docs/billing-flows.md)
- [Billing API](docs/billing-api.md)
- [Billing States](docs/billing-states.md)
- [Billing Webhooks](docs/billing-webhooks.md)

## Database

Database migrations and seeds are available in the `database/` directory:

- [Database README](database/README.md)

```bash
# Run migrations with Supabase CLI
supabase db push

# Or with psql
cat database/migrations/*.sql | psql -h <host> -U <user> -d <database>
```

## Development

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

## Project Structure

```
niigaki-core/
├── src/
│   ├── index.ts           # Main exports
│   ├── auth/
│   │   ├── rbac.ts        # Role-Based Access Control
│   │   ├── abac.ts        # Attribute-Based Access Control
│   │   ├── jwt-claims.ts  # JWT claims generator
│   │   └── permissions.ts # Permission utilities
│   ├── logging/
│   │   ├── logger.ts      # Universal logger
│   │   └── log-context.ts # Log context management
│   ├── api/
│   │   ├── http-client.ts # HTTP client wrapper
│   │   └── error-handler.ts # Error handling utilities
│   ├── tenancy/
│   │   ├── tenant-context.ts # Tenant context store
│   │   ├── tenant-resolver.ts # Tenant resolution
│   │   └── multi-tenant-helpers.ts # Multi-tenant utilities
│   ├── billing/
│   │   ├── types/         # Type definitions
│   │   │   ├── billing-status.ts
│   │   │   ├── billing-plan.ts
│   │   │   └── asaas-events.ts
│   │   ├── dtos/          # Data transfer objects
│   │   │   ├── customer.dto.ts
│   │   │   ├── subscription.dto.ts
│   │   │   └── invoice.dto.ts
│   │   ├── asaas-client.ts      # ASAAS API client
│   │   ├── billing-service.ts   # Main billing service
│   │   ├── subscription-service.ts # Subscription lifecycle
│   │   ├── webhook-handler.ts   # Webhook processing
│   │   ├── billing-enforcer.ts  # Access control
│   │   └── billing-errors.ts    # Error classes
│   └── utils/
│       ├── validation.ts  # Validation utilities
│       ├── dates.ts       # Date utilities
│       └── math.ts        # Math utilities
├── tests/
│   ├── auth.spec.ts
│   ├── billing.spec.ts
│   ├── logging.spec.ts
│   └── tenancy.spec.ts
├── docs/
│   ├── core-architecture.md
│   ├── auth-engine.md
│   ├── logging-guide.md
│   ├── tenancy-guide.md
│   ├── http-client-guide.md
│   ├── billing-overview.md
│   ├── billing-flows.md
│   ├── billing-api.md
│   ├── billing-states.md
│   └── billing-webhooks.md
├── database/
│   ├── migrations/         # SQL schema migrations
│   │   ├── 001_create_tenants.sql
│   │   ├── 002_create_stores.sql
│   │   ├── 003_create_users.sql
│   │   ├── 004_create_billing_plans.sql
│   │   ├── 005_create_billing_history.sql
│   │   ├── 006_create_audit_logs.sql
│   │   ├── 007_row_level_security.sql
│   │   └── 008_create_webhook_events.sql
│   ├── seeds/              # Initial data
│   │   └── 001_billing_plans.sql
│   └── README.md
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## License

MIT © Niigaki Software House
