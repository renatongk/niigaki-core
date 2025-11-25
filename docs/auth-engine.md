# Authentication Engine Guide

This guide covers the authentication and authorization features of `@niigaki/core`.

## Overview

The auth engine provides two complementary access control systems:

- **RBAC (Role-Based Access Control)** - Permission based on user roles
- **ABAC (Attribute-Based Access Control)** - Permission based on attributes/policies

## RBAC (Role-Based Access Control)

### Roles

The system defines five roles in a hierarchy:

```typescript
enum Role {
  SYSTEM_ADMIN = 'system_admin',    // Full system access
  APP_ADMIN = 'app_admin',          // Application-level admin
  TENANT_ADMIN = 'tenant_admin',    // Tenant-level admin
  STORE_MANAGER = 'store_manager',  // Store-level manager
  STORE_EMPLOYEE = 'store_employee' // Basic store access
}
```

### Role Hierarchy

```
SYSTEM_ADMIN
    ↓
APP_ADMIN
    ↓
TENANT_ADMIN
    ↓
STORE_MANAGER
    ↓
STORE_EMPLOYEE
```

### Actions

Available actions/permissions:

```typescript
enum Action {
  // System
  MANAGE_SYSTEM, VIEW_SYSTEM_LOGS,
  
  // Tenants
  MANAGE_TENANTS, VIEW_TENANTS, CREATE_TENANT, DELETE_TENANT,
  
  // Stores
  MANAGE_STORES, VIEW_STORES, CREATE_STORE, DELETE_STORE,
  
  // Users
  MANAGE_USERS, VIEW_USERS, CREATE_USER, DELETE_USER,
  
  // Products
  MANAGE_PRODUCTS, VIEW_PRODUCTS, CREATE_PRODUCT, DELETE_PRODUCT,
  
  // Orders
  MANAGE_ORDERS, VIEW_ORDERS, CREATE_ORDER, CANCEL_ORDER,
  
  // Reports
  VIEW_REPORTS, EXPORT_REPORTS,
  
  // Settings
  MANAGE_SETTINGS, VIEW_SETTINGS,
}
```

### Basic Usage

```typescript
import { can, canAny, Role, Action } from '@niigaki/core';

// Check single role
if (can(Role.STORE_MANAGER, Action.MANAGE_PRODUCTS)) {
  // Allow product management
}

// Check multiple roles (user may have multiple)
if (canAny([Role.TENANT_ADMIN, Role.STORE_MANAGER], Action.VIEW_REPORTS)) {
  // Allow report access
}
```

### Getting Permissions

```typescript
import { getPermissions, getAllPermissions, Role } from '@niigaki/core';

// Get permissions for a single role
const managerPerms = getPermissions(Role.STORE_MANAGER);

// Get union of permissions for multiple roles
const allPerms = getAllPermissions([Role.STORE_MANAGER, Role.STORE_EMPLOYEE]);
```

### Checking Role Hierarchy

```typescript
import { hasHigherPrivilege, Role } from '@niigaki/core';

// Check if a role is higher in the hierarchy
hasHigherPrivilege(Role.TENANT_ADMIN, Role.STORE_MANAGER); // true
hasHigherPrivilege(Role.STORE_EMPLOYEE, Role.STORE_MANAGER); // false
```

## ABAC (Attribute-Based Access Control)

ABAC provides flexible, policy-based access control using attributes of users, resources, and context.

### Core Concepts

- **User** - The entity requesting access with attributes
- **Resource** - The entity being accessed with attributes
- **Policy** - A condition that must be satisfied for access
- **Action** - The operation being performed

### User and Resource Types

```typescript
interface AbacUser {
  id: string;
  tenant_id: string;
  store_id?: string;
  roles: string[];
  permissions: string[];
  attributes: Record<string, unknown>;
}

interface AbacResource {
  id: string;
  type: string;
  tenant_id: string;
  store_id?: string;
  owner_id?: string;
  attributes: Record<string, unknown>;
}
```

### Built-in Policies

The library includes these default policies:

```typescript
// same_tenant: User and resource must belong to same tenant
abac.evaluate(resource, user, 'same_tenant');

// same_store: User and resource must belong to same store
abac.evaluate(resource, user, 'same_store');

// is_owner: User must be the owner of the resource
abac.evaluate(resource, user, 'is_owner');

// has_permission: User must have permission for the action
abac.evaluate(resource, user, 'has_permission', 'manage_products');
```

### Policy Evaluation

```typescript
import { abac, type AbacUser, type AbacResource } from '@niigaki/core';

const user: AbacUser = {
  id: 'user-1',
  tenant_id: 'tenant-1',
  store_id: 'store-1',
  roles: ['store_manager'],
  permissions: ['manage_products'],
  attributes: { department: 'sales' },
};

const resource: AbacResource = {
  id: 'product-1',
  type: 'product',
  tenant_id: 'tenant-1',
  store_id: 'store-1',
  owner_id: 'user-1',
  attributes: { category: 'electronics' },
};

// Single policy evaluation
const result = abac.evaluate(resource, user, 'same_tenant');
console.log(result.allowed);  // true
console.log(result.policy);   // 'same_tenant'
console.log(result.reason);   // "Access granted by policy 'same_tenant'"
```

### Multiple Policy Evaluation

```typescript
// Check if ALL policies pass (AND logic)
const allPass = abac.checkAll(resource, user, ['same_tenant', 'same_store']);

// Check if ANY policy passes (OR logic)
const anyPass = abac.checkAny(resource, user, ['same_tenant', 'is_owner']);

// Get detailed results for all policies
const results = abac.evaluateAll(resource, user, ['same_tenant', 'same_store']);
```

### Custom Policies

#### Inline Policy Function

```typescript
// Quick inline policy
const customPolicy = (ctx) => ctx.resource.attributes.category === 'electronics';
const result = abac.evaluate(resource, user, customPolicy);
```

#### Registered Policy

```typescript
import { createPolicy, registerPolicy, abac } from '@niigaki/core';

// Create a named policy
const electronicsCategoryPolicy = createPolicy(
  'is_electronics',
  'Resource must be in electronics category',
  (ctx) => ctx.resource.attributes.category === 'electronics'
);

// Register it globally
registerPolicy(electronicsCategoryPolicy);

// Use by name
const result = abac.evaluate(resource, user, 'is_electronics');
```

### Policy Context

Policies receive a full context object:

```typescript
interface AbacContext {
  user: AbacUser;
  resource: AbacResource;
  action: string;
  environment?: Record<string, unknown>;
}

const timeBasedPolicy = createPolicy(
  'business_hours',
  'Access only during business hours',
  (ctx) => {
    const hour = new Date().getHours();
    return hour >= 9 && hour < 17;
  }
);
```

## JWT Claims

Generate JWT claims for Supabase authentication:

```typescript
import { buildClaims, buildSupabaseClaims, type ClaimsUser } from '@niigaki/core';

const user: ClaimsUser = {
  id: 'user-123',
  email: 'user@example.com',
  tenant_id: 'tenant-abc',
  store_id: 'store-xyz',
  app_id: 'main-app',
  roles: [Role.STORE_MANAGER],
  permissions: ['manage_products', 'view_orders'],
  features: ['advanced_reporting'],
};

// Standard JWT claims
const claims = buildClaims(user, { expiresIn: 3600 });

// Supabase-formatted claims
const supabaseClaims = buildSupabaseClaims(user);
```

### Claims Structure

```typescript
interface NiigakiClaims {
  sub: string;           // User ID
  email: string;         // Email
  tenant_id: string;     // Tenant identifier
  store_id?: string;     // Store identifier
  app_id?: string;       // Application identifier
  roles: string[];       // User roles
  permissions: string[]; // User permissions
  features: string[];    // Enabled features
  iat: number;           // Issued at
  exp: number;           // Expiration
  metadata?: Record<string, unknown>;
}
```

### Validating Claims

```typescript
import { validateClaims, isExpired } from '@niigaki/core';

// Validate structure
if (validateClaims(decodedToken)) {
  // Check expiration
  if (isExpired(decodedToken)) {
    throw new UnauthorizedError('Token expired');
  }
  
  // Extract user data
  const user = extractUserFromClaims(decodedToken);
}
```

## Integrating with Supabase

### Custom Access Token Hook

```typescript
// supabase/functions/custom-access-token/index.ts
import { buildSupabaseClaims, type ClaimsUser } from '@niigaki/core';

export async function customAccessToken(event) {
  const user = await getUserData(event.user_id);
  
  const claims = buildSupabaseClaims({
    id: user.id,
    email: user.email,
    tenant_id: user.tenant_id,
    roles: user.roles,
    permissions: user.permissions,
    features: user.features,
  });

  return {
    ...event.claims,
    ...claims,
  };
}
```

### Row Level Security

```sql
-- Access resources in same tenant
CREATE POLICY "tenant_isolation" ON products
  FOR ALL
  USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

-- Access based on role
CREATE POLICY "manager_access" ON products
  FOR UPDATE
  USING (
    'store_manager' = ANY((auth.jwt() -> 'app_metadata' ->> 'roles')::text[])
  );
```

## Best Practices

### 1. Combine RBAC and ABAC

```typescript
function checkProductAccess(user, product) {
  // RBAC: Check role has base permission
  if (!can(user.role, Action.MANAGE_PRODUCTS)) {
    throw new ForbiddenError('Role lacks product management permission');
  }

  // ABAC: Check tenant and store scope
  if (!abac.checkAll(product, user, ['same_tenant', 'same_store'])) {
    throw new ForbiddenError('Product not in your scope');
  }
}
```

### 2. Use Permission Context

```typescript
import { hasPermission, type PermissionContext } from '@niigaki/core';

const userCtx: PermissionContext = {
  user_id: user.id,
  tenant_id: user.tenant_id,
  store_id: user.store_id,
  roles: user.roles,
};

const resourceCtx = {
  tenant_id: product.tenant_id,
  store_id: product.store_id,
  owner_id: product.created_by,
};

if (hasPermission(userCtx, resourceCtx, Action.MANAGE_PRODUCTS)) {
  // Allow access
}
```

### 3. Extend with Custom Actions

Define custom actions for your domain:

```typescript
// Extend Action enum in your application
const CustomAction = {
  ...Action,
  APPROVE_DISCOUNT: 'approve_discount',
  BULK_IMPORT: 'bulk_import',
};

// Add to role permissions mapping
```

### 4. Audit Access Decisions

```typescript
import { logger, abac } from '@niigaki/core';

function auditedAccessCheck(user, resource, policies) {
  const results = abac.evaluateAll(resource, user, policies);
  
  logger.info('access_check', 'Evaluating access', {
    userId: user.id,
    resourceId: resource.id,
    policies,
    results: results.map(r => ({ policy: r.policy, allowed: r.allowed })),
  });

  return results.every(r => r.allowed);
}
```
