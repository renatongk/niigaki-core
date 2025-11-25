# Core Architecture

This document describes the architecture and design principles of the `@niigaki/core` library.

## Overview

`@niigaki/core` is the foundational library for all Niigaki Software House products. It provides:

- **Authentication Engine** - RBAC and ABAC for flexible access control
- **JWT Claims** - Standardized token generation for Supabase
- **Multi-tenant Support** - Context management and helpers for SaaS
- **Universal Logging** - Structured logging with correlation IDs
- **HTTP Client** - Standardized API client with interceptors
- **Utilities** - Common validation, date, and math functions

## Design Principles

### 1. Single Responsibility

Each module has a clear, focused purpose:

```
auth/       → Authentication and authorization
logging/    → Structured logging infrastructure
api/        → HTTP communication and error handling
tenancy/    → Multi-tenant context management
utils/      → Common utility functions
```

### 2. Zero External Dependencies (Runtime)

The core library minimizes runtime dependencies to:
- `uuid` - For generating correlation IDs

All other functionality is built using native TypeScript/JavaScript.

### 3. Type Safety

Full TypeScript support with:
- Strict mode enabled
- Exported type definitions
- Generic type parameters where appropriate

### 4. Extensibility

All modules support extension:
- RBAC/ABAC policies can be customized
- Logger supports custom handlers
- HTTP client has interceptors
- Tenant resolver supports multiple strategies

## Module Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    @niigaki/core                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │    Auth     │  │   Logging   │  │    API      │     │
│  │   Engine    │  │   System    │  │   Client    │     │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤     │
│  │ • RBAC      │  │ • Logger    │  │ • HTTP      │     │
│  │ • ABAC      │  │ • Context   │  │ • Errors    │     │
│  │ • JWT       │  │ • Formats   │  │ • Intercept │     │
│  │ • Perms     │  │             │  │             │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                          │
│  ┌─────────────┐  ┌─────────────────────────────────┐  │
│  │   Tenancy   │  │           Utilities             │  │
│  │   Module    │  │                                 │  │
│  ├─────────────┤  ├─────────────────────────────────┤  │
│  │ • Context   │  │ • Validation  • Dates  • Math   │  │
│  │ • Resolver  │  │                                 │  │
│  │ • Helpers   │  │                                 │  │
│  └─────────────┘  └─────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Usage Pattern

### 1. Initialization

```typescript
import { logger, tenantContext, rbac } from '@niigaki/core';

// Configure logger
logger.configure({
  minLevel: LogLevel.INFO,
  jsonFormat: process.env.NODE_ENV === 'production',
});
```

### 2. Request Handling

```typescript
import {
  createLogContext,
  tenantContextStore,
  assertTenantContext,
} from '@niigaki/core';

async function handleRequest(req, res) {
  // Create log context with correlation ID
  const logCtx = createLogContext({
    tenantId: req.headers['x-tenant-id'],
    userId: req.user?.id,
  });

  // Set tenant context
  const tenant = await resolveTenant(req);
  tenantContextStore.set({ tenant, userId: req.user?.id });

  try {
    logger.start('handleRequest', logCtx);
    
    // Process request...
    
    logger.end('handleRequest', logCtx);
  } catch (error) {
    logger.error('handleRequest', logCtx, error);
    throw error;
  }
}
```

### 3. Authorization

```typescript
import { can, Role, Action, abac } from '@niigaki/core';

function checkAccess(user, resource) {
  // RBAC check
  if (!can(user.role, Action.MANAGE_PRODUCTS)) {
    throw new ForbiddenError('Insufficient permissions');
  }

  // ABAC check
  const result = abac.evaluate(resource, user, 'same_tenant');
  if (!result.allowed) {
    throw new ForbiddenError(result.reason);
  }
}
```

## Integration Points

### Supabase

The library integrates with Supabase through:
- JWT claims generation for custom access tokens
- Tenant resolution from Supabase auth
- Policy evaluation for Row Level Security

### Express/Fastify

Middleware integration:
```typescript
app.use((req, res, next) => {
  const logCtx = createLogContext();
  contextStore.set(logCtx);
  next();
});
```

### Next.js

Server component integration:
```typescript
import { tenantContextStore } from '@niigaki/core';

export default async function Page() {
  const tenant = await getTenant();
  return tenantContextStore.runAsync({ tenant }, async () => {
    // Render with tenant context
  });
}
```

## Error Handling Strategy

All errors extend `AppError`:

```typescript
try {
  await operation();
} catch (error) {
  if (error instanceof AppError) {
    // Known, operational error
    return error.toResponse();
  }
  // Unknown error - log and wrap
  logger.error('operation', context, error);
  throw AppError.fromError(error);
}
```

## Testing Strategy

The library provides:
- Mock tenant creation utilities
- Context store isolation
- Type-safe test helpers

```typescript
import { createMockTenant, tenantContextStore } from '@niigaki/core';

beforeEach(() => {
  tenantContextStore.clear();
});

it('should filter by tenant', () => {
  const tenant = createMockTenant({ id: 'test-tenant' });
  tenantContextStore.set({ tenant });
  
  // Test with tenant context...
});
```

## Performance Considerations

1. **Context Storage** - Uses simple objects, not AsyncLocalStorage
2. **Policy Evaluation** - O(n) where n is number of policies
3. **Permission Lookup** - O(1) hash map lookup
4. **Logging** - Async-safe, non-blocking output
