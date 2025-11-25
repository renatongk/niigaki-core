/**
 * Tenant Context Module
 * Manages the current tenant context for multi-tenant operations.
 */

/**
 * Tenant information structure
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  settings: TenantSettings;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tenant status
 */
export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

/**
 * Tenant settings
 */
export interface TenantSettings {
  features: string[];
  limits: TenantLimits;
  branding?: TenantBranding;
  custom: Record<string, unknown>;
}

/**
 * Tenant resource limits
 */
export interface TenantLimits {
  maxStores: number;
  maxUsers: number;
  maxProducts: number;
  storageQuotaMb: number;
}

/**
 * Tenant branding options
 */
export interface TenantBranding {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customCss?: string;
}

/**
 * Tenant context holder
 */
export interface TenantContextData {
  tenant: Tenant;
  storeId?: string;
  userId?: string;
}

/**
 * Tenant context store for managing current context
 */
class TenantContextStore {
  private current: TenantContextData | null = null;

  /**
   * Set the current tenant context
   */
  set(context: TenantContextData): void {
    this.current = context;
  }

  /**
   * Get the current tenant context
   */
  get(): TenantContextData | null {
    return this.current;
  }

  /**
   * Get the current tenant
   */
  getTenant(): Tenant | null {
    return this.current?.tenant ?? null;
  }

  /**
   * Get the current tenant ID
   */
  getTenantId(): string | null {
    return this.current?.tenant.id ?? null;
  }

  /**
   * Get the current store ID
   */
  getStoreId(): string | null {
    return this.current?.storeId ?? null;
  }

  /**
   * Get the current user ID
   */
  getUserId(): string | null {
    return this.current?.userId ?? null;
  }

  /**
   * Clear the current context
   */
  clear(): void {
    this.current = null;
  }

  /**
   * Check if a tenant context is set
   */
  isSet(): boolean {
    return this.current !== null;
  }

  /**
   * Run a function within a specific tenant context
   */
  run<T>(context: TenantContextData, fn: () => T): T {
    const previous = this.current;
    this.current = context;
    try {
      return fn();
    } finally {
      this.current = previous;
    }
  }

  /**
   * Run an async function within a specific tenant context
   */
  async runAsync<T>(context: TenantContextData, fn: () => Promise<T>): Promise<T> {
    const previous = this.current;
    this.current = context;
    try {
      return await fn();
    } finally {
      this.current = previous;
    }
  }
}

/**
 * Global tenant context store instance
 */
export const tenantContextStore = new TenantContextStore();

/**
 * Get the current tenant or throw if not set
 */
export function getCurrentTenant(): Tenant {
  const tenant = tenantContextStore.getTenant();
  if (!tenant) {
    throw new Error('Tenant context not set');
  }
  return tenant;
}

/**
 * Get the current tenant ID or throw if not set
 */
export function getCurrentTenantId(): string {
  const tenantId = tenantContextStore.getTenantId();
  if (!tenantId) {
    throw new Error('Tenant context not set');
  }
  return tenantId;
}

/**
 * Check if a feature is enabled for the current tenant
 */
export function hasFeature(feature: string): boolean {
  const tenant = tenantContextStore.getTenant();
  if (!tenant) {
    return false;
  }
  return tenant.settings.features.includes(feature);
}

/**
 * Get a tenant setting value
 */
export function getTenantSetting<T>(key: string, defaultValue: T): T {
  const tenant = tenantContextStore.getTenant();
  if (!tenant) {
    return defaultValue;
  }
  const value = tenant.settings.custom[key];
  return (value as T) ?? defaultValue;
}

/**
 * Tenant context module export
 */
export const tenantContext = {
  store: tenantContextStore,
  getCurrentTenant,
  getCurrentTenantId,
  hasFeature,
  getTenantSetting,
  TenantStatus,
};
