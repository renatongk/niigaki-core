import { describe, it, expect, beforeEach } from 'vitest';
import {
  // RBAC
  Role,
  Action,
  can,
  canAny,
  getPermissions,
  getAllPermissions,
  hasHigherPrivilege,
  // ABAC
  abac,
  builtInPolicies,
  registerPolicy,
  createPolicy,
  type AbacUser,
  type AbacResource,
  // JWT Claims
  buildClaims,
  buildSupabaseClaims,
  extractUserFromClaims,
  validateClaims,
  isExpired,
  type ClaimsUser,
  // Permissions
  hasPermission,
  formatPermission,
  parsePermission,
  PermissionScope,
  type PermissionContext,
  type ResourceContext,
} from '../src';

describe('Auth Module', () => {
  describe('RBAC', () => {
    describe('can()', () => {
      it('should allow system admin to perform any action', () => {
        expect(can(Role.SYSTEM_ADMIN, Action.MANAGE_SYSTEM)).toBe(true);
        expect(can(Role.SYSTEM_ADMIN, Action.MANAGE_TENANTS)).toBe(true);
        expect(can(Role.SYSTEM_ADMIN, Action.MANAGE_USERS)).toBe(true);
        expect(can(Role.SYSTEM_ADMIN, Action.VIEW_REPORTS)).toBe(true);
      });

      it('should allow tenant admin to manage stores and users', () => {
        expect(can(Role.TENANT_ADMIN, Action.MANAGE_STORES)).toBe(true);
        expect(can(Role.TENANT_ADMIN, Action.MANAGE_USERS)).toBe(true);
        expect(can(Role.TENANT_ADMIN, Action.VIEW_REPORTS)).toBe(true);
      });

      it('should deny tenant admin from managing system', () => {
        expect(can(Role.TENANT_ADMIN, Action.MANAGE_SYSTEM)).toBe(false);
        expect(can(Role.TENANT_ADMIN, Action.VIEW_SYSTEM_LOGS)).toBe(false);
        expect(can(Role.TENANT_ADMIN, Action.DELETE_TENANT)).toBe(false);
      });

      it('should allow store manager to manage products and orders', () => {
        expect(can(Role.STORE_MANAGER, Action.MANAGE_PRODUCTS)).toBe(true);
        expect(can(Role.STORE_MANAGER, Action.MANAGE_ORDERS)).toBe(true);
        expect(can(Role.STORE_MANAGER, Action.VIEW_REPORTS)).toBe(true);
      });

      it('should deny store manager from managing stores', () => {
        expect(can(Role.STORE_MANAGER, Action.MANAGE_STORES)).toBe(false);
        expect(can(Role.STORE_MANAGER, Action.DELETE_STORE)).toBe(false);
      });

      it('should limit store employee to basic operations', () => {
        expect(can(Role.STORE_EMPLOYEE, Action.VIEW_PRODUCTS)).toBe(true);
        expect(can(Role.STORE_EMPLOYEE, Action.VIEW_ORDERS)).toBe(true);
        expect(can(Role.STORE_EMPLOYEE, Action.CREATE_ORDER)).toBe(true);
        expect(can(Role.STORE_EMPLOYEE, Action.MANAGE_PRODUCTS)).toBe(false);
        expect(can(Role.STORE_EMPLOYEE, Action.DELETE_PRODUCT)).toBe(false);
      });
    });

    describe('canAny()', () => {
      it('should return true if any role has permission', () => {
        expect(canAny([Role.STORE_EMPLOYEE, Role.STORE_MANAGER], Action.MANAGE_PRODUCTS)).toBe(true);
      });

      it('should return false if no role has permission', () => {
        expect(canAny([Role.STORE_EMPLOYEE], Action.MANAGE_PRODUCTS)).toBe(false);
      });
    });

    describe('getPermissions()', () => {
      it('should return all permissions for a role', () => {
        const permissions = getPermissions(Role.STORE_EMPLOYEE);
        expect(permissions).toContain(Action.VIEW_PRODUCTS);
        expect(permissions).toContain(Action.CREATE_ORDER);
        expect(permissions).not.toContain(Action.MANAGE_PRODUCTS);
      });
    });

    describe('getAllPermissions()', () => {
      it('should return union of permissions for multiple roles', () => {
        const permissions = getAllPermissions([Role.STORE_EMPLOYEE, Role.STORE_MANAGER]);
        expect(permissions).toContain(Action.VIEW_PRODUCTS);
        expect(permissions).toContain(Action.MANAGE_PRODUCTS);
        expect(permissions).toContain(Action.VIEW_REPORTS);
      });
    });

    describe('hasHigherPrivilege()', () => {
      it('should correctly identify privilege hierarchy', () => {
        expect(hasHigherPrivilege(Role.SYSTEM_ADMIN, Role.TENANT_ADMIN)).toBe(true);
        expect(hasHigherPrivilege(Role.TENANT_ADMIN, Role.STORE_MANAGER)).toBe(true);
        expect(hasHigherPrivilege(Role.STORE_MANAGER, Role.STORE_EMPLOYEE)).toBe(true);
        expect(hasHigherPrivilege(Role.STORE_EMPLOYEE, Role.STORE_MANAGER)).toBe(false);
        expect(hasHigherPrivilege(Role.TENANT_ADMIN, Role.SYSTEM_ADMIN)).toBe(false);
      });
    });
  });

  describe('ABAC', () => {
    const testUser: AbacUser = {
      id: 'user-1',
      tenant_id: 'tenant-1',
      store_id: 'store-1',
      roles: ['store_manager'],
      permissions: ['manage_products', 'view_orders'],
      attributes: { department: 'sales' },
    };

    const testResource: AbacResource = {
      id: 'product-1',
      type: 'product',
      tenant_id: 'tenant-1',
      store_id: 'store-1',
      owner_id: 'user-1',
      attributes: { category: 'electronics' },
    };

    describe('evaluate()', () => {
      it('should allow access when same_tenant policy passes', () => {
        const result = abac.evaluate(testResource, testUser, 'same_tenant');
        expect(result.allowed).toBe(true);
        expect(result.policy).toBe('same_tenant');
      });

      it('should deny access when tenant IDs differ', () => {
        const differentTenantResource = { ...testResource, tenant_id: 'tenant-2' };
        const result = abac.evaluate(differentTenantResource, testUser, 'same_tenant');
        expect(result.allowed).toBe(false);
      });

      it('should allow access when same_store policy passes', () => {
        const result = abac.evaluate(testResource, testUser, 'same_store');
        expect(result.allowed).toBe(true);
      });

      it('should allow access when is_owner policy passes', () => {
        const result = abac.evaluate(testResource, testUser, 'is_owner');
        expect(result.allowed).toBe(true);
      });

      it('should work with custom policy function', () => {
        const customPolicy = (ctx: { resource: AbacResource }) =>
          ctx.resource.attributes['category'] === 'electronics';
        const result = abac.evaluate(testResource, testUser, customPolicy);
        expect(result.allowed).toBe(true);
      });
    });

    describe('checkAll()', () => {
      it('should return true when all policies pass', () => {
        const result = abac.checkAll(testResource, testUser, ['same_tenant', 'same_store']);
        expect(result).toBe(true);
      });

      it('should return false when any policy fails', () => {
        const differentStoreResource = { ...testResource, store_id: 'store-2' };
        const result = abac.checkAll(differentStoreResource, testUser, ['same_tenant', 'same_store']);
        expect(result).toBe(false);
      });
    });

    describe('checkAny()', () => {
      it('should return true when any policy passes', () => {
        const differentStoreResource = { ...testResource, store_id: 'store-2' };
        const result = abac.checkAny(differentStoreResource, testUser, ['same_tenant', 'same_store']);
        expect(result).toBe(true);
      });
    });

    describe('registerPolicy()', () => {
      it('should allow registering custom policies', () => {
        const customPolicy = createPolicy(
          'is_electronics',
          'Resource must be in electronics category',
          (ctx) => ctx.resource.attributes['category'] === 'electronics'
        );
        registerPolicy(customPolicy);

        const result = abac.evaluate(testResource, testUser, 'is_electronics');
        expect(result.allowed).toBe(true);
      });
    });

    describe('builtInPolicies', () => {
      it('should have expected built-in policies', () => {
        const policyNames = builtInPolicies.map((p) => p.name);
        expect(policyNames).toContain('same_tenant');
        expect(policyNames).toContain('same_store');
        expect(policyNames).toContain('is_owner');
        expect(policyNames).toContain('has_permission');
      });
    });
  });

  describe('JWT Claims', () => {
    const testClaimsUser: ClaimsUser = {
      id: 'user-123',
      email: 'test@example.com',
      tenant_id: 'tenant-abc',
      store_id: 'store-xyz',
      app_id: 'app-main',
      roles: [Role.STORE_MANAGER],
      permissions: ['manage_products', 'view_orders'],
      features: ['advanced_reporting', 'bulk_import'],
      metadata: { theme: 'dark' },
    };

    describe('buildClaims()', () => {
      it('should build claims with all required fields', () => {
        const claims = buildClaims(testClaimsUser);

        expect(claims.sub).toBe('user-123');
        expect(claims.email).toBe('test@example.com');
        expect(claims.tenant_id).toBe('tenant-abc');
        expect(claims.store_id).toBe('store-xyz');
        expect(claims.app_id).toBe('app-main');
        expect(claims.roles).toEqual([Role.STORE_MANAGER]);
        expect(claims.permissions).toEqual(['manage_products', 'view_orders']);
        expect(claims.features).toEqual(['advanced_reporting', 'bulk_import']);
        expect(claims.iat).toBeDefined();
        expect(claims.exp).toBeDefined();
        expect(claims.exp).toBeGreaterThan(claims.iat);
      });

      it('should respect custom expiration time', () => {
        const claims = buildClaims(testClaimsUser, { expiresIn: 7200 });
        expect(claims.exp - claims.iat).toBe(7200);
      });

      it('should allow overriding app_id', () => {
        const claims = buildClaims(testClaimsUser, { appId: 'different-app' });
        expect(claims.app_id).toBe('different-app');
      });
    });

    describe('buildSupabaseClaims()', () => {
      it('should format claims for Supabase', () => {
        const claims = buildSupabaseClaims(testClaimsUser);

        expect(claims.app_metadata).toBeDefined();
        const appMetadata = claims.app_metadata as Record<string, unknown>;
        expect(appMetadata['tenant_id']).toBe('tenant-abc');
        expect(appMetadata['roles']).toEqual([Role.STORE_MANAGER]);
        expect(appMetadata['permissions']).toEqual(['manage_products', 'view_orders']);
      });
    });

    describe('extractUserFromClaims()', () => {
      it('should extract user data from claims', () => {
        const claims = buildClaims(testClaimsUser);
        const extracted = extractUserFromClaims(claims);

        expect(extracted.id).toBe('user-123');
        expect(extracted.email).toBe('test@example.com');
        expect(extracted.tenant_id).toBe('tenant-abc');
        expect(extracted.roles).toEqual([Role.STORE_MANAGER]);
      });
    });

    describe('validateClaims()', () => {
      it('should validate correct claims structure', () => {
        const claims = buildClaims(testClaimsUser);
        expect(validateClaims(claims)).toBe(true);
      });

      it('should reject invalid claims', () => {
        expect(validateClaims(null)).toBe(false);
        expect(validateClaims({})).toBe(false);
        expect(validateClaims({ sub: 'test' })).toBe(false);
      });
    });

    describe('isExpired()', () => {
      it('should detect expired claims', () => {
        const claims = buildClaims(testClaimsUser, { expiresIn: -1 });
        expect(isExpired(claims)).toBe(true);
      });

      it('should detect valid claims', () => {
        const claims = buildClaims(testClaimsUser, { expiresIn: 3600 });
        expect(isExpired(claims)).toBe(false);
      });
    });
  });

  describe('Permissions', () => {
    describe('hasPermission()', () => {
      const userCtx: PermissionContext = {
        user_id: 'user-1',
        tenant_id: 'tenant-1',
        store_id: 'store-1',
        roles: [Role.STORE_MANAGER],
      };

      const resourceCtx: ResourceContext = {
        tenant_id: 'tenant-1',
        store_id: 'store-1',
        owner_id: 'user-1',
      };

      it('should allow access when role has permission and tenant matches', () => {
        expect(hasPermission(userCtx, resourceCtx, Action.MANAGE_PRODUCTS)).toBe(true);
      });

      it('should deny access when tenant does not match', () => {
        const differentTenantResource = { ...resourceCtx, tenant_id: 'tenant-2' };
        expect(hasPermission(userCtx, differentTenantResource, Action.MANAGE_PRODUCTS)).toBe(false);
      });

      it('should deny access when role lacks permission', () => {
        expect(hasPermission(userCtx, resourceCtx, Action.MANAGE_SYSTEM)).toBe(false);
      });

      it('should allow system admin to cross tenant boundaries', () => {
        const adminCtx = { ...userCtx, roles: [Role.SYSTEM_ADMIN] };
        const differentTenantResource = { ...resourceCtx, tenant_id: 'tenant-2' };
        expect(hasPermission(adminCtx, differentTenantResource, Action.MANAGE_PRODUCTS)).toBe(true);
      });
    });

    describe('formatPermission()', () => {
      it('should format permission without resource', () => {
        const result = formatPermission(Action.MANAGE_PRODUCTS, PermissionScope.TENANT);
        expect(result).toBe('manage_products:tenant');
      });

      it('should format permission with resource', () => {
        const result = formatPermission(Action.MANAGE_PRODUCTS, PermissionScope.STORE, 'electronics');
        expect(result).toBe('manage_products:store:electronics');
      });
    });

    describe('parsePermission()', () => {
      it('should parse permission without resource', () => {
        const result = parsePermission('manage_products:tenant');
        expect(result).not.toBeNull();
        expect(result?.action).toBe(Action.MANAGE_PRODUCTS);
        expect(result?.scope).toBe(PermissionScope.TENANT);
        expect(result?.resource).toBeUndefined();
      });

      it('should parse permission with resource', () => {
        const result = parsePermission('manage_products:store:electronics');
        expect(result).not.toBeNull();
        expect(result?.resource).toBe('electronics');
      });

      it('should return null for invalid permissions', () => {
        expect(parsePermission('invalid')).toBeNull();
        expect(parsePermission('invalid_action:tenant')).toBeNull();
      });
    });
  });
});
