/**
 * Tenant Resolver Module
 * Resolves tenant information from various sources.
 */

import type { Tenant } from './tenant-context';
import { TenantStatus } from './tenant-context';

/**
 * Tenant resolution source
 */
export enum ResolutionSource {
  /** Resolve from subdomain (e.g., tenant1.app.com) */
  SUBDOMAIN = 'subdomain',
  /** Resolve from custom domain (e.g., tenant1.com) */
  CUSTOM_DOMAIN = 'custom_domain',
  /** Resolve from URL path (e.g., /tenant/tenant1/...) */
  PATH = 'path',
  /** Resolve from HTTP header (e.g., X-Tenant-ID) */
  HEADER = 'header',
  /** Resolve from JWT claims */
  JWT = 'jwt',
  /** Resolve from query parameter */
  QUERY = 'query',
}

/**
 * Tenant resolver configuration
 */
export interface ResolverConfig {
  /** Resolution sources to try in order */
  sources: ResolutionSource[];
  /** Header name for header resolution */
  headerName?: string;
  /** Query parameter name */
  queryParam?: string;
  /** Path prefix (e.g., '/tenant/') */
  pathPrefix?: string;
  /** Base domain for subdomain resolution */
  baseDomain?: string;
}

/**
 * Tenant lookup function type
 */
export type TenantLookup = (identifier: string) => Promise<Tenant | null>;

/**
 * Request context for resolution
 */
export interface RequestContext {
  host?: string;
  path?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  claims?: Record<string, unknown>;
}

/**
 * Resolution result
 */
export interface ResolutionResult {
  tenant: Tenant | null;
  source: ResolutionSource | null;
  identifier: string | null;
}

/**
 * Default resolver configuration
 */
const defaultConfig: ResolverConfig = {
  sources: [
    ResolutionSource.HEADER,
    ResolutionSource.SUBDOMAIN,
    ResolutionSource.PATH,
  ],
  headerName: 'X-Tenant-ID',
  queryParam: 'tenant_id',
  pathPrefix: '/tenant/',
};

/**
 * Tenant Resolver class
 */
export class TenantResolver {
  private config: ResolverConfig;
  private lookup: TenantLookup;

  constructor(lookup: TenantLookup, config?: Partial<ResolverConfig>) {
    this.lookup = lookup;
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Resolve tenant from request context
   */
  async resolve(context: RequestContext): Promise<ResolutionResult> {
    for (const source of this.config.sources) {
      const identifier = this.extractIdentifier(source, context);
      if (identifier) {
        const tenant = await this.lookup(identifier);
        if (tenant) {
          return { tenant, source, identifier };
        }
      }
    }

    return { tenant: null, source: null, identifier: null };
  }

  /**
   * Extract tenant identifier from a specific source
   */
  private extractIdentifier(
    source: ResolutionSource,
    context: RequestContext
  ): string | null {
    switch (source) {
      case ResolutionSource.HEADER:
        return this.extractFromHeader(context);
      case ResolutionSource.SUBDOMAIN:
        return this.extractFromSubdomain(context);
      case ResolutionSource.CUSTOM_DOMAIN:
        return this.extractFromCustomDomain(context);
      case ResolutionSource.PATH:
        return this.extractFromPath(context);
      case ResolutionSource.JWT:
        return this.extractFromJwt(context);
      case ResolutionSource.QUERY:
        return this.extractFromQuery(context);
      default:
        return null;
    }
  }

  /**
   * Extract from HTTP header
   */
  private extractFromHeader(context: RequestContext): string | null {
    if (!context.headers || !this.config.headerName) {
      return null;
    }
    // Headers are case-insensitive
    const headerName = this.config.headerName.toLowerCase();
    for (const [key, value] of Object.entries(context.headers)) {
      if (key.toLowerCase() === headerName && value) {
        return value;
      }
    }
    return null;
  }

  /**
   * Extract from subdomain
   */
  private extractFromSubdomain(context: RequestContext): string | null {
    if (!context.host || !this.config.baseDomain) {
      return null;
    }

    const host = context.host.toLowerCase();
    const baseDomain = this.config.baseDomain.toLowerCase();

    if (!host.endsWith(baseDomain)) {
      return null;
    }

    // Extract subdomain (e.g., "tenant1" from "tenant1.app.com")
    const subdomain = host.slice(0, -baseDomain.length - 1);
    if (subdomain && !subdomain.includes('.')) {
      return subdomain;
    }

    return null;
  }

  /**
   * Extract from custom domain
   */
  private extractFromCustomDomain(context: RequestContext): string | null {
    // For custom domains, the host itself is the identifier
    return context.host ?? null;
  }

  /**
   * Extract from URL path
   */
  private extractFromPath(context: RequestContext): string | null {
    if (!context.path || !this.config.pathPrefix) {
      return null;
    }

    const path = context.path;
    const prefix = this.config.pathPrefix;

    if (!path.startsWith(prefix)) {
      return null;
    }

    // Extract tenant slug from path
    const remaining = path.slice(prefix.length);
    const slashIndex = remaining.indexOf('/');
    const slug = slashIndex > 0 ? remaining.slice(0, slashIndex) : remaining;

    return slug || null;
  }

  /**
   * Extract from JWT claims
   */
  private extractFromJwt(context: RequestContext): string | null {
    if (!context.claims) {
      return null;
    }

    const tenantId = context.claims['tenant_id'];
    return typeof tenantId === 'string' ? tenantId : null;
  }

  /**
   * Extract from query parameter
   */
  private extractFromQuery(context: RequestContext): string | null {
    if (!context.query || !this.config.queryParam) {
      return null;
    }

    return context.query[this.config.queryParam] ?? null;
  }
}

/**
 * Create a tenant resolver instance
 */
export function createTenantResolver(
  lookup: TenantLookup,
  config?: Partial<ResolverConfig>
): TenantResolver {
  return new TenantResolver(lookup, config);
}

/**
 * Create a mock tenant for testing
 */
export function createMockTenant(overrides?: Partial<Tenant>): Tenant {
  return {
    id: 'test-tenant-id',
    name: 'Test Tenant',
    slug: 'test-tenant',
    status: TenantStatus.ACTIVE,
    settings: {
      features: [],
      limits: {
        maxStores: 10,
        maxUsers: 100,
        maxProducts: 10000,
        storageQuotaMb: 1024,
      },
      custom: {},
    },
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Tenant resolver module export
 */
export const tenantResolver = {
  ResolutionSource,
  TenantResolver,
  createTenantResolver,
  createMockTenant,
};
