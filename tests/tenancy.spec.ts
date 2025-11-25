import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Tenant Context
  TenantStatus,
  tenantContextStore,
  getCurrentTenant,
  getCurrentTenantId,
  hasFeature,
  getTenantSetting,
  type Tenant,
  type TenantContextData,
  // Tenant Resolver
  ResolutionSource,
  TenantResolver,
  createTenantResolver,
  createMockTenant,
  type RequestContext,
  // Multi-tenant Helpers
  TenantScopeError,
  assertTenantContext,
  assertTenantScope,
  assertStoreScope,
  belongsToCurrentTenant,
  belongsToCurrentStore,
  filterByTenant,
  filterByStore,
  withTenantId,
  withStoreId,
  withTenantContext,
  isTenantActive,
  assertTenantActive,
  withTenant,
  withTenantAsync,
} from '../src';

describe('Tenancy Module', () => {
  const createTestTenant = (overrides?: Partial<Tenant>): Tenant => ({
    id: 'tenant-1',
    name: 'Test Tenant',
    slug: 'test-tenant',
    status: TenantStatus.ACTIVE,
    settings: {
      features: ['feature-a', 'feature-b'],
      limits: {
        maxStores: 10,
        maxUsers: 100,
        maxProducts: 10000,
        storageQuotaMb: 1024,
      },
      custom: {
        customSetting: 'value',
      },
    },
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe('Tenant Context', () => {
    beforeEach(() => {
      tenantContextStore.clear();
    });

    describe('tenantContextStore', () => {
      it('should set and get tenant context', () => {
        const tenant = createTestTenant();
        const context: TenantContextData = {
          tenant,
          storeId: 'store-1',
          userId: 'user-1',
        };

        tenantContextStore.set(context);

        expect(tenantContextStore.get()).toBe(context);
        expect(tenantContextStore.getTenant()).toBe(tenant);
        expect(tenantContextStore.getTenantId()).toBe('tenant-1');
        expect(tenantContextStore.getStoreId()).toBe('store-1');
        expect(tenantContextStore.getUserId()).toBe('user-1');
      });

      it('should clear context', () => {
        tenantContextStore.set({ tenant: createTestTenant() });
        tenantContextStore.clear();

        expect(tenantContextStore.get()).toBeNull();
        expect(tenantContextStore.getTenant()).toBeNull();
        expect(tenantContextStore.isSet()).toBe(false);
      });

      it('should run function in tenant context', () => {
        const tenant = createTestTenant({ id: 'run-tenant' });

        const result = tenantContextStore.run({ tenant }, () => {
          expect(tenantContextStore.getTenantId()).toBe('run-tenant');
          return 'result';
        });

        expect(result).toBe('result');
        expect(tenantContextStore.get()).toBeNull();
      });

      it('should run async function in tenant context', async () => {
        const tenant = createTestTenant({ id: 'async-tenant' });

        const result = await tenantContextStore.runAsync({ tenant }, async () => {
          expect(tenantContextStore.getTenantId()).toBe('async-tenant');
          return 'async-result';
        });

        expect(result).toBe('async-result');
        expect(tenantContextStore.get()).toBeNull();
      });
    });

    describe('getCurrentTenant()', () => {
      it('should return current tenant', () => {
        const tenant = createTestTenant();
        tenantContextStore.set({ tenant });

        expect(getCurrentTenant()).toBe(tenant);
      });

      it('should throw when no context set', () => {
        expect(() => getCurrentTenant()).toThrow('Tenant context not set');
      });
    });

    describe('getCurrentTenantId()', () => {
      it('should return current tenant ID', () => {
        tenantContextStore.set({ tenant: createTestTenant({ id: 'my-tenant' }) });
        expect(getCurrentTenantId()).toBe('my-tenant');
      });

      it('should throw when no context set', () => {
        expect(() => getCurrentTenantId()).toThrow('Tenant context not set');
      });
    });

    describe('hasFeature()', () => {
      it('should return true for enabled features', () => {
        tenantContextStore.set({ tenant: createTestTenant() });

        expect(hasFeature('feature-a')).toBe(true);
        expect(hasFeature('feature-b')).toBe(true);
      });

      it('should return false for disabled features', () => {
        tenantContextStore.set({ tenant: createTestTenant() });
        expect(hasFeature('feature-c')).toBe(false);
      });

      it('should return false when no context', () => {
        expect(hasFeature('feature-a')).toBe(false);
      });
    });

    describe('getTenantSetting()', () => {
      it('should return custom setting value', () => {
        tenantContextStore.set({ tenant: createTestTenant() });
        expect(getTenantSetting('customSetting', 'default')).toBe('value');
      });

      it('should return default for missing setting', () => {
        tenantContextStore.set({ tenant: createTestTenant() });
        expect(getTenantSetting('missingSetting', 'default')).toBe('default');
      });

      it('should return default when no context', () => {
        expect(getTenantSetting('customSetting', 'default')).toBe('default');
      });
    });
  });

  describe('Tenant Resolver', () => {
    const mockLookup = async (identifier: string): Promise<Tenant | null> => {
      if (identifier === 'known-tenant' || identifier === 'tenant-1') {
        return createTestTenant({ id: identifier, slug: identifier });
      }
      return null;
    };

    describe('resolve()', () => {
      it('should resolve from header', async () => {
        const resolver = createTenantResolver(mockLookup, {
          sources: [ResolutionSource.HEADER],
          headerName: 'X-Tenant-ID',
        });

        const context: RequestContext = {
          headers: { 'x-tenant-id': 'known-tenant' },
        };

        const result = await resolver.resolve(context);

        expect(result.tenant).not.toBeNull();
        expect(result.tenant?.id).toBe('known-tenant');
        expect(result.source).toBe(ResolutionSource.HEADER);
      });

      it('should resolve from subdomain', async () => {
        const resolver = createTenantResolver(mockLookup, {
          sources: [ResolutionSource.SUBDOMAIN],
          baseDomain: 'app.com',
        });

        const context: RequestContext = {
          host: 'known-tenant.app.com',
        };

        const result = await resolver.resolve(context);

        expect(result.tenant).not.toBeNull();
        expect(result.source).toBe(ResolutionSource.SUBDOMAIN);
      });

      it('should resolve from path', async () => {
        const resolver = createTenantResolver(mockLookup, {
          sources: [ResolutionSource.PATH],
          pathPrefix: '/tenant/',
        });

        const context: RequestContext = {
          path: '/tenant/known-tenant/dashboard',
        };

        const result = await resolver.resolve(context);

        expect(result.tenant).not.toBeNull();
        expect(result.source).toBe(ResolutionSource.PATH);
      });

      it('should resolve from JWT claims', async () => {
        const resolver = createTenantResolver(mockLookup, {
          sources: [ResolutionSource.JWT],
        });

        const context: RequestContext = {
          claims: { tenant_id: 'known-tenant' },
        };

        const result = await resolver.resolve(context);

        expect(result.tenant).not.toBeNull();
        expect(result.source).toBe(ResolutionSource.JWT);
      });

      it('should try multiple sources in order', async () => {
        const resolver = createTenantResolver(mockLookup, {
          sources: [ResolutionSource.HEADER, ResolutionSource.PATH],
          headerName: 'X-Tenant-ID',
          pathPrefix: '/tenant/',
        });

        // No header, but has path
        const context: RequestContext = {
          path: '/tenant/known-tenant/dashboard',
        };

        const result = await resolver.resolve(context);

        expect(result.tenant).not.toBeNull();
        expect(result.source).toBe(ResolutionSource.PATH);
      });

      it('should return null when tenant not found', async () => {
        const resolver = createTenantResolver(mockLookup);

        const context: RequestContext = {
          headers: { 'x-tenant-id': 'unknown-tenant' },
        };

        const result = await resolver.resolve(context);

        expect(result.tenant).toBeNull();
        expect(result.source).toBeNull();
      });
    });

    describe('createMockTenant()', () => {
      it('should create mock tenant with defaults', () => {
        const tenant = createMockTenant();

        expect(tenant.id).toBeDefined();
        expect(tenant.name).toBeDefined();
        expect(tenant.status).toBe(TenantStatus.ACTIVE);
        expect(tenant.settings.features).toEqual([]);
      });

      it('should allow overrides', () => {
        const tenant = createMockTenant({
          id: 'custom-id',
          name: 'Custom Tenant',
          status: TenantStatus.SUSPENDED,
        });

        expect(tenant.id).toBe('custom-id');
        expect(tenant.name).toBe('Custom Tenant');
        expect(tenant.status).toBe(TenantStatus.SUSPENDED);
      });
    });
  });

  describe('Multi-tenant Helpers', () => {
    beforeEach(() => {
      tenantContextStore.clear();
    });

    describe('assertTenantContext()', () => {
      it('should return context when set', () => {
        const tenant = createTestTenant();
        tenantContextStore.set({ tenant });

        const context = assertTenantContext();
        expect(context.tenant).toBe(tenant);
      });

      it('should throw TenantScopeError when not set', () => {
        expect(() => assertTenantContext()).toThrow(TenantScopeError);
        expect(() => assertTenantContext()).toThrow('Tenant context is required');
      });
    });

    describe('assertTenantScope()', () => {
      it('should pass when tenant IDs match', () => {
        tenantContextStore.set({ tenant: createTestTenant({ id: 'tenant-1' }) });
        expect(() => assertTenantScope('tenant-1')).not.toThrow();
      });

      it('should throw when tenant IDs differ', () => {
        tenantContextStore.set({ tenant: createTestTenant({ id: 'tenant-1' }) });
        expect(() => assertTenantScope('tenant-2')).toThrow(TenantScopeError);
      });
    });

    describe('assertStoreScope()', () => {
      it('should pass when store IDs match', () => {
        tenantContextStore.set({
          tenant: createTestTenant(),
          storeId: 'store-1',
        });
        expect(() => assertStoreScope('store-1')).not.toThrow();
      });

      it('should throw when store IDs differ', () => {
        tenantContextStore.set({
          tenant: createTestTenant(),
          storeId: 'store-1',
        });
        expect(() => assertStoreScope('store-2')).toThrow(TenantScopeError);
      });

      it('should pass when no store context is set', () => {
        tenantContextStore.set({ tenant: createTestTenant() });
        expect(() => assertStoreScope('any-store')).not.toThrow();
      });
    });

    describe('belongsToCurrentTenant()', () => {
      it('should return true when tenant matches', () => {
        tenantContextStore.set({ tenant: createTestTenant({ id: 'tenant-1' }) });
        expect(belongsToCurrentTenant('tenant-1')).toBe(true);
      });

      it('should return false when tenant differs', () => {
        tenantContextStore.set({ tenant: createTestTenant({ id: 'tenant-1' }) });
        expect(belongsToCurrentTenant('tenant-2')).toBe(false);
      });

      it('should return false when no context', () => {
        expect(belongsToCurrentTenant('tenant-1')).toBe(false);
      });
    });

    describe('belongsToCurrentStore()', () => {
      it('should return true when store matches', () => {
        tenantContextStore.set({
          tenant: createTestTenant(),
          storeId: 'store-1',
        });
        expect(belongsToCurrentStore('store-1')).toBe(true);
      });

      it('should return false when store differs', () => {
        tenantContextStore.set({
          tenant: createTestTenant(),
          storeId: 'store-1',
        });
        expect(belongsToCurrentStore('store-2')).toBe(false);
      });

      it('should return true when no store context', () => {
        tenantContextStore.set({ tenant: createTestTenant() });
        expect(belongsToCurrentStore('any-store')).toBe(true);
      });
    });

    describe('filterByTenant()', () => {
      it('should filter resources by current tenant', () => {
        tenantContextStore.set({ tenant: createTestTenant({ id: 'tenant-1' }) });

        const resources = [
          { id: '1', tenant_id: 'tenant-1' },
          { id: '2', tenant_id: 'tenant-2' },
          { id: '3', tenant_id: 'tenant-1' },
        ];

        const filtered = filterByTenant(resources);

        expect(filtered.length).toBe(2);
        expect(filtered.every((r) => r.tenant_id === 'tenant-1')).toBe(true);
      });

      it('should return empty array when no context', () => {
        const resources = [{ id: '1', tenant_id: 'tenant-1' }];
        expect(filterByTenant(resources)).toEqual([]);
      });
    });

    describe('filterByStore()', () => {
      it('should filter resources by current store', () => {
        tenantContextStore.set({
          tenant: createTestTenant(),
          storeId: 'store-1',
        });

        const resources = [
          { id: '1', store_id: 'store-1' },
          { id: '2', store_id: 'store-2' },
          { id: '3', store_id: 'store-1' },
        ];

        const filtered = filterByStore(resources);

        expect(filtered.length).toBe(2);
      });

      it('should return all resources when no store context', () => {
        tenantContextStore.set({ tenant: createTestTenant() });

        const resources = [
          { id: '1', store_id: 'store-1' },
          { id: '2', store_id: 'store-2' },
        ];

        expect(filterByStore(resources)).toEqual(resources);
      });
    });

    describe('withTenantId()', () => {
      it('should add tenant_id to object', () => {
        tenantContextStore.set({ tenant: createTestTenant({ id: 'tenant-1' }) });

        const data = { name: 'Test' };
        const result = withTenantId(data);

        expect(result.tenant_id).toBe('tenant-1');
        expect(result.name).toBe('Test');
      });
    });

    describe('withStoreId()', () => {
      it('should add store_id when store context exists', () => {
        tenantContextStore.set({
          tenant: createTestTenant(),
          storeId: 'store-1',
        });

        const data = { name: 'Test' };
        const result = withStoreId(data);

        expect(result.store_id).toBe('store-1');
      });

      it('should not add store_id when no store context', () => {
        tenantContextStore.set({ tenant: createTestTenant() });

        const data = { name: 'Test' };
        const result = withStoreId(data);

        expect(result.store_id).toBeUndefined();
      });
    });

    describe('withTenantContext()', () => {
      it('should add both tenant_id and store_id', () => {
        tenantContextStore.set({
          tenant: createTestTenant({ id: 'tenant-1' }),
          storeId: 'store-1',
        });

        const data = { name: 'Test' };
        const result = withTenantContext(data);

        expect(result.tenant_id).toBe('tenant-1');
        expect(result.store_id).toBe('store-1');
        expect(result.name).toBe('Test');
      });
    });

    describe('isTenantActive()', () => {
      it('should return true for active tenant', () => {
        tenantContextStore.set({
          tenant: createTestTenant({ status: TenantStatus.ACTIVE }),
        });
        expect(isTenantActive()).toBe(true);
      });

      it('should return false for inactive tenant', () => {
        tenantContextStore.set({
          tenant: createTestTenant({ status: TenantStatus.SUSPENDED }),
        });
        expect(isTenantActive()).toBe(false);
      });

      it('should return false when no context', () => {
        expect(isTenantActive()).toBe(false);
      });
    });

    describe('assertTenantActive()', () => {
      it('should pass for active tenant', () => {
        tenantContextStore.set({
          tenant: createTestTenant({ status: TenantStatus.ACTIVE }),
        });
        expect(() => assertTenantActive()).not.toThrow();
      });

      it('should throw for suspended tenant', () => {
        tenantContextStore.set({
          tenant: createTestTenant({ status: TenantStatus.SUSPENDED }),
        });
        expect(() => assertTenantActive()).toThrow(TenantScopeError);
        expect(() => assertTenantActive()).toThrow('suspended');
      });
    });

    describe('withTenant() / withTenantAsync()', () => {
      it('should execute function in tenant context', () => {
        const tenant = createTestTenant({ id: 'with-tenant' });

        const result = withTenant(tenant, () => {
          return getCurrentTenantId();
        });

        expect(result).toBe('with-tenant');
        expect(tenantContextStore.get()).toBeNull();
      });

      it('should execute async function in tenant context', async () => {
        const tenant = createTestTenant({ id: 'async-with-tenant' });

        const result = await withTenantAsync(tenant, async () => {
          return getCurrentTenantId();
        });

        expect(result).toBe('async-with-tenant');
        expect(tenantContextStore.get()).toBeNull();
      });
    });
  });
});
