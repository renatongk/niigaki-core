# Multi-Tenancy Guide

This guide covers the multi-tenant support features in `@niigaki/core`.

## Overview

The tenancy module provides:

- **Tenant Context** - Store and access current tenant information
- **Tenant Resolver** - Resolve tenant from various sources
- **Multi-tenant Helpers** - Utilities for tenant-scoped operations

## Core Concepts

### Tenant

A tenant represents an isolated customer account in a SaaS application:

```typescript
interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  settings: TenantSettings;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}
```

### Tenant Settings

```typescript
interface TenantSettings {
  features: string[];      // Enabled feature flags
  limits: TenantLimits;    // Resource limits
  branding?: TenantBranding;
  custom: Record<string, unknown>;
}

interface TenantLimits {
  maxStores: number;
  maxUsers: number;
  maxProducts: number;
  storageQuotaMb: number;
}
```

## Tenant Context

### Setting Context

```typescript
import { tenantContextStore, type Tenant } from '@niigaki/core';

// Set tenant context globally
const tenant: Tenant = await fetchTenant(tenantId);
tenantContextStore.set({
  tenant,
  storeId: 'store-123',
  userId: 'user-456',
});

// Clear when done
tenantContextStore.clear();
```

### Accessing Context

```typescript
import {
  getCurrentTenant,
  getCurrentTenantId,
  tenantContextStore,
} from '@niigaki/core';

// Get current tenant (throws if not set)
const tenant = getCurrentTenant();

// Get current tenant ID (throws if not set)
const tenantId = getCurrentTenantId();

// Get context safely
const context = tenantContextStore.get();
if (context) {
  console.log(context.tenant.name);
}

// Get specific values
const storeId = tenantContextStore.getStoreId();
const userId = tenantContextStore.getUserId();
```

### Scoped Execution

Run code within a specific tenant context:

```typescript
import { tenantContextStore, withTenant, withTenantAsync } from '@niigaki/core';

// Synchronous
const result = withTenant(tenant, () => {
  // getCurrentTenantId() works here
  return processData();
});

// Asynchronous
const result = await withTenantAsync(tenant, async () => {
  // Async operations with tenant context
  return await fetchTenantData();
});

// Using store methods
const result = tenantContextStore.run({ tenant, storeId: 'store-1' }, () => {
  return processStoreData();
});
```

### Feature Flags

```typescript
import { hasFeature, getTenantSetting } from '@niigaki/core';

// Check if feature is enabled
if (hasFeature('advanced_reporting')) {
  // Show advanced reports
}

// Get custom setting with default
const theme = getTenantSetting('ui.theme', 'light');
```

## Tenant Resolution

Resolve tenant identity from incoming requests:

### Resolution Sources

```typescript
enum ResolutionSource {
  SUBDOMAIN = 'subdomain',      // tenant1.app.com
  CUSTOM_DOMAIN = 'custom_domain', // tenant1.com
  PATH = 'path',                // /tenant/tenant1/...
  HEADER = 'header',            // X-Tenant-ID header
  JWT = 'jwt',                  // JWT claims
  QUERY = 'query',              // ?tenant_id=xxx
}
```

### Creating a Resolver

```typescript
import { createTenantResolver, ResolutionSource } from '@niigaki/core';

// Tenant lookup function
const lookupTenant = async (identifier: string) => {
  return await db.tenants.findByIdOrSlug(identifier);
};

// Create resolver
const resolver = createTenantResolver(lookupTenant, {
  sources: [
    ResolutionSource.HEADER,
    ResolutionSource.SUBDOMAIN,
    ResolutionSource.PATH,
  ],
  headerName: 'X-Tenant-ID',
  baseDomain: 'myapp.com',
  pathPrefix: '/tenant/',
});
```

### Resolving Tenant

```typescript
import type { RequestContext } from '@niigaki/core';

const requestContext: RequestContext = {
  host: 'acme.myapp.com',
  path: '/api/products',
  headers: {
    'x-tenant-id': 'acme',
    'authorization': 'Bearer ...',
  },
  query: {},
  claims: decodedJwt,
};

const result = await resolver.resolve(requestContext);

if (result.tenant) {
  console.log(`Resolved tenant: ${result.tenant.name}`);
  console.log(`From source: ${result.source}`);
} else {
  throw new Error('Unable to resolve tenant');
}
```

### Express Integration

```typescript
import express from 'express';
import { createTenantResolver, tenantContextStore } from '@niigaki/core';

const resolver = createTenantResolver(lookupTenant, {
  sources: [ResolutionSource.HEADER, ResolutionSource.SUBDOMAIN],
  headerName: 'X-Tenant-ID',
  baseDomain: 'myapp.com',
});

// Tenant middleware
app.use(async (req, res, next) => {
  const context = {
    host: req.hostname,
    path: req.path,
    headers: req.headers as Record<string, string>,
    claims: req.user, // From auth middleware
  };

  const result = await resolver.resolve(context);
  
  if (!result.tenant) {
    return res.status(400).json({ error: 'Invalid tenant' });
  }
  
  // Set context for the request
  tenantContextStore.set({
    tenant: result.tenant,
    userId: req.user?.id,
  });
  
  // Attach to request for convenience
  req.tenant = result.tenant;
  
  next();
});
```

## Multi-tenant Helpers

### Scope Assertions

```typescript
import {
  assertTenantContext,
  assertTenantScope,
  assertStoreScope,
  assertTenantActive,
} from '@niigaki/core';

// Assert tenant context is set
const context = assertTenantContext(); // Throws if not set

// Assert resource belongs to current tenant
assertTenantScope(resource.tenant_id); // Throws if mismatch

// Assert resource belongs to current store
assertStoreScope(resource.store_id); // Throws if mismatch

// Assert tenant is active
assertTenantActive(); // Throws if suspended/inactive
```

### Scope Checks

```typescript
import {
  belongsToCurrentTenant,
  belongsToCurrentStore,
  isTenantActive,
} from '@niigaki/core';

// Check without throwing
if (belongsToCurrentTenant(resource.tenant_id)) {
  // Resource is in scope
}

if (belongsToCurrentStore(resource.store_id)) {
  // Resource is in store scope
}

if (isTenantActive()) {
  // Tenant is active
}
```

### Data Filtering

```typescript
import { filterByTenant, filterByStore } from '@niigaki/core';

// Filter array to current tenant's resources
const products = await fetchAllProducts();
const tenantProducts = filterByTenant(products);

// Filter to current store
const storeProducts = filterByStore(tenantProducts);
```

### Adding Context to Data

```typescript
import {
  withTenantId,
  withStoreId,
  withTenantContext,
} from '@niigaki/core';

// Add tenant_id to new records
const newProduct = withTenantId({
  name: 'Widget',
  price: 9.99,
});
// { name: 'Widget', price: 9.99, tenant_id: 'current-tenant-id' }

// Add store_id
const withStore = withStoreId(newProduct);
// { name: 'Widget', price: 9.99, tenant_id: '...', store_id: '...' }

// Add both at once
const complete = withTenantContext({
  name: 'Widget',
  price: 9.99,
});
```

### Tenant-Scoped Functions

```typescript
import { createTenantScopedFn } from '@niigaki/core';

// Create a function that always runs in a specific tenant context
const processForAcme = createTenantScopedFn(acmeTenant, (orderId: string) => {
  // getCurrentTenantId() returns acmeTenant.id here
  return processOrder(orderId);
});

// Use later
processForAcme('order-123');
```

## Error Handling

```typescript
import { TenantScopeError } from '@niigaki/core';

try {
  assertTenantScope(resource.tenant_id);
} catch (error) {
  if (error instanceof TenantScopeError) {
    // Handle scope error
    console.log(error.code);    // 'FORBIDDEN'
    console.log(error.message); // 'Resource does not belong to current tenant'
    console.log(error.details); // { currentTenantId: '...', resourceTenantId: '...' }
  }
}
```

## Testing

### Mock Tenant

```typescript
import { createMockTenant, tenantContextStore } from '@niigaki/core';

describe('TenantScoped tests', () => {
  beforeEach(() => {
    tenantContextStore.clear();
  });

  it('should process tenant data', () => {
    const mockTenant = createMockTenant({
      id: 'test-tenant',
      name: 'Test Tenant',
      settings: {
        features: ['feature-a', 'feature-b'],
        limits: { maxStores: 5, maxUsers: 50, maxProducts: 1000, storageQuotaMb: 100 },
        custom: { theme: 'dark' },
      },
    });

    tenantContextStore.set({ tenant: mockTenant });

    // Test with tenant context
    expect(hasFeature('feature-a')).toBe(true);
  });
});
```

### Isolated Tests

```typescript
it('should process in tenant scope', () => {
  const tenant = createMockTenant({ id: 'isolated-test' });

  const result = withTenant(tenant, () => {
    return getCurrentTenantId();
  });

  expect(result).toBe('isolated-test');
  expect(tenantContextStore.get()).toBeNull(); // Context restored
});
```

## Integration with Supabase

### Row Level Security

```sql
-- Tenant isolation policy
CREATE POLICY "tenant_isolation" ON products
  FOR ALL
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- Store-level policy
CREATE POLICY "store_access" ON products
  FOR SELECT
  USING (
    store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::uuid
    OR 'tenant_admin' = ANY((auth.jwt() -> 'app_metadata' ->> 'roles')::text[])
  );
```

### Supabase Client Setup

```typescript
import { createClient } from '@supabase/supabase-js';
import { getCurrentTenantId, tenantContextStore } from '@niigaki/core';

// Create tenant-aware client
function getTenantClient() {
  const tenantId = getCurrentTenantId();
  
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        'X-Tenant-ID': tenantId,
      },
    },
  });
}
```

## Best Practices

### 1. Set Context Early

```typescript
// In request middleware
app.use(async (req, res, next) => {
  const result = await resolver.resolve(extractContext(req));
  tenantContextStore.set({ tenant: result.tenant });
  next();
});
```

### 2. Clear Context After Request

```typescript
app.use((req, res, next) => {
  res.on('finish', () => {
    tenantContextStore.clear();
  });
  next();
});
```

### 3. Always Validate Scope

```typescript
async function updateProduct(id: string, data: UpdateData) {
  const product = await fetchProduct(id);
  
  // Validate before update
  assertTenantScope(product.tenant_id);
  assertStoreScope(product.store_id);
  
  return await db.products.update(id, data);
}
```

### 4. Use withTenantContext for New Records

```typescript
async function createProduct(data: CreateProductData) {
  const enriched = withTenantContext(data);
  return await db.products.create(enriched);
}
```

### 5. Feature Flag Checks

```typescript
function getAvailableFeatures() {
  return {
    advancedReporting: hasFeature('advanced_reporting'),
    bulkImport: hasFeature('bulk_import'),
    customBranding: hasFeature('custom_branding'),
  };
}
```

### 6. Handle Suspended Tenants

```typescript
app.use((req, res, next) => {
  try {
    assertTenantActive();
    next();
  } catch (error) {
    res.status(403).json({
      error: 'TENANT_SUSPENDED',
      message: 'Your account has been suspended',
    });
  }
});
```
