/**
 * Multi-Tenant Helpers Module
 * Utility functions for working with multi-tenant data and operations.
 */

import { tenantContextStore, getCurrentTenantId } from './tenant-context';
import type { Tenant, TenantContextData } from './tenant-context';
import { TenantStatus } from './tenant-context';
import { AppError, ErrorCode } from '../api/error-handler';

/**
 * Error thrown when tenant scope assertion fails
 */
export class TenantScopeError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    const options: { details?: Record<string, unknown> } = {};
    if (details) {
      options.details = details;
    }
    super(ErrorCode.FORBIDDEN, message, options);
    this.name = 'TenantScopeError';
  }
}

/**
 * Assert that a tenant context is set
 * @throws TenantScopeError if no tenant context is set
 */
export function assertTenantContext(): TenantContextData {
  const context = tenantContextStore.get();
  if (!context) {
    throw new TenantScopeError('Tenant context is required but not set');
  }
  return context;
}

/**
 * Assert that the current tenant owns a resource
 * @param resourceTenantId - Tenant ID of the resource
 * @throws TenantScopeError if tenant IDs don't match
 */
export function assertTenantScope(resourceTenantId: string): void {
  const currentTenantId = getCurrentTenantId();
  if (currentTenantId !== resourceTenantId) {
    throw new TenantScopeError(
      'Resource does not belong to the current tenant',
      {
        currentTenantId,
        resourceTenantId,
      }
    );
  }
}

/**
 * Assert that the current store owns a resource (if store context is set)
 * @param resourceStoreId - Store ID of the resource
 * @throws TenantScopeError if store IDs don't match and store context is set
 */
export function assertStoreScope(resourceStoreId: string): void {
  const currentStoreId = tenantContextStore.getStoreId();
  if (currentStoreId && currentStoreId !== resourceStoreId) {
    throw new TenantScopeError(
      'Resource does not belong to the current store',
      {
        currentStoreId,
        resourceStoreId,
      }
    );
  }
}

/**
 * Check if resource belongs to current tenant
 * @param resourceTenantId - Tenant ID of the resource
 * @returns true if resource belongs to current tenant
 */
export function belongsToCurrentTenant(resourceTenantId: string): boolean {
  const currentTenantId = tenantContextStore.getTenantId();
  return currentTenantId !== null && currentTenantId === resourceTenantId;
}

/**
 * Check if resource belongs to current store
 * @param resourceStoreId - Store ID of the resource
 * @returns true if resource belongs to current store (or no store context is set)
 */
export function belongsToCurrentStore(resourceStoreId: string): boolean {
  const currentStoreId = tenantContextStore.getStoreId();
  if (!currentStoreId) {
    return true; // No store scope restriction
  }
  return currentStoreId === resourceStoreId;
}

/**
 * Filter an array of resources to only those belonging to current tenant
 * @param resources - Array of resources with tenant_id property
 * @returns Filtered array containing only current tenant's resources
 */
export function filterByTenant<T extends { tenant_id: string }>(
  resources: T[]
): T[] {
  const currentTenantId = tenantContextStore.getTenantId();
  if (!currentTenantId) {
    return [];
  }
  return resources.filter((r) => r.tenant_id === currentTenantId);
}

/**
 * Filter an array of resources to only those belonging to current store
 * @param resources - Array of resources with store_id property
 * @returns Filtered array containing only current store's resources
 */
export function filterByStore<T extends { store_id: string }>(
  resources: T[]
): T[] {
  const currentStoreId = tenantContextStore.getStoreId();
  if (!currentStoreId) {
    return resources; // No store scope restriction
  }
  return resources.filter((r) => r.store_id === currentStoreId);
}

/**
 * Add tenant ID to an object if tenant context is set
 * @param data - Object to add tenant ID to
 * @returns Object with tenant_id added
 */
export function withTenantId<T extends object>(data: T): T & { tenant_id: string } {
  const tenantId = getCurrentTenantId();
  return { ...data, tenant_id: tenantId };
}

/**
 * Add store ID to an object if store context is set
 * @param data - Object to add store ID to
 * @returns Object with store_id added (if store context exists)
 */
export function withStoreId<T extends object>(
  data: T
): T & { store_id?: string } {
  const storeId = tenantContextStore.getStoreId();
  if (storeId) {
    return { ...data, store_id: storeId };
  }
  return data;
}

/**
 * Add both tenant and store IDs to an object
 * @param data - Object to add IDs to
 * @returns Object with tenant_id and optionally store_id added
 */
export function withTenantContext<T extends object>(
  data: T
): T & { tenant_id: string; store_id?: string } {
  return withStoreId(withTenantId(data));
}

/**
 * Check if current tenant is active
 * @returns true if tenant exists and is active
 */
export function isTenantActive(): boolean {
  const tenant = tenantContextStore.getTenant();
  return tenant !== null && tenant.status === TenantStatus.ACTIVE;
}

/**
 * Assert that current tenant is active
 * @throws TenantScopeError if tenant is not active
 */
export function assertTenantActive(): void {
  const tenant = tenantContextStore.getTenant();
  if (!tenant) {
    throw new TenantScopeError('Tenant context is required');
  }
  if (tenant.status !== TenantStatus.ACTIVE) {
    throw new TenantScopeError(`Tenant is ${tenant.status}`, {
      tenantId: tenant.id,
      status: tenant.status,
    });
  }
}

/**
 * Execute a function within a specific tenant context
 * @param tenant - Tenant to use
 * @param fn - Function to execute
 * @returns Result of the function
 */
export function withTenant<T>(tenant: Tenant, fn: () => T): T {
  return tenantContextStore.run({ tenant }, fn);
}

/**
 * Execute an async function within a specific tenant context
 * @param tenant - Tenant to use
 * @param fn - Async function to execute
 * @returns Promise with result of the function
 */
export function withTenantAsync<T>(
  tenant: Tenant,
  fn: () => Promise<T>
): Promise<T> {
  return tenantContextStore.runAsync({ tenant }, fn);
}

/**
 * Create a tenant-scoped wrapper for a function
 * @param tenant - Tenant to scope to
 * @param fn - Function to wrap
 * @returns Wrapped function that executes in tenant context
 */
export function createTenantScopedFn<T extends unknown[], R>(
  tenant: Tenant,
  fn: (...args: T) => R
): (...args: T) => R {
  return (...args: T) => withTenant(tenant, () => fn(...args));
}

/**
 * Multi-tenant helpers module export
 */
export const multiTenantHelpers = {
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
  createTenantScopedFn,
};
