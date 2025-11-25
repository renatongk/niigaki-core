/**
 * JWT Claims Generator Module
 * Generates standardized JWT claims for Supabase authentication.
 */

import type { Role } from './rbac';

/**
 * User data structure for building claims
 */
export interface ClaimsUser {
  id: string;
  email: string;
  tenant_id: string;
  store_id?: string;
  app_id?: string;
  roles: Role[];
  permissions: string[];
  features?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Standard JWT claims structure for Niigaki platform
 */
export interface NiigakiClaims {
  /** Subject - User ID */
  sub: string;
  /** Email address */
  email: string;
  /** Tenant identifier */
  tenant_id: string;
  /** Store identifier (optional) */
  store_id?: string;
  /** Application identifier */
  app_id?: string;
  /** User roles */
  roles: string[];
  /** User permissions */
  permissions: string[];
  /** Enabled features */
  features: string[];
  /** Issued at timestamp */
  iat: number;
  /** Expiration timestamp */
  exp: number;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Options for building claims
 */
export interface ClaimsOptions {
  /** Token expiration time in seconds (default: 3600 = 1 hour) */
  expiresIn?: number;
  /** Application ID override */
  appId?: string;
  /** Additional custom claims */
  customClaims?: Record<string, unknown>;
}

/**
 * Default expiration time in seconds (1 hour)
 */
const DEFAULT_EXPIRATION = 3600;

/**
 * Build JWT claims for a user
 * @param user - User data to build claims from
 * @param options - Optional configuration for claims generation
 * @returns NiigakiClaims object ready for JWT encoding
 */
export function buildClaims(
  user: ClaimsUser,
  options: ClaimsOptions = {}
): NiigakiClaims {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = options.expiresIn ?? DEFAULT_EXPIRATION;

  const claims: NiigakiClaims = {
    sub: user.id,
    email: user.email,
    tenant_id: user.tenant_id,
    roles: user.roles,
    permissions: user.permissions,
    features: user.features ?? [],
    iat: now,
    exp: now + expiresIn,
  };

  // Add optional fields
  if (user.store_id) {
    claims.store_id = user.store_id;
  }

  const appIdValue = options.appId ?? user.app_id;
  if (appIdValue) {
    claims.app_id = appIdValue;
  }

  if (user.metadata ?? options.customClaims) {
    claims.metadata = {
      ...user.metadata,
      ...options.customClaims,
    };
  }

  return claims;
}

/**
 * Build claims for Supabase custom access token hook
 * @param user - User data
 * @param options - Claims options
 * @returns Claims object formatted for Supabase
 */
export function buildSupabaseClaims(
  user: ClaimsUser,
  options: ClaimsOptions = {}
): Record<string, unknown> {
  const claims = buildClaims(user, options);

  return {
    app_metadata: {
      tenant_id: claims.tenant_id,
      store_id: claims.store_id,
      app_id: claims.app_id,
      roles: claims.roles,
      permissions: claims.permissions,
      features: claims.features,
    },
    user_metadata: claims.metadata ?? {},
  };
}

/**
 * Extract user info from JWT claims
 * @param claims - JWT claims object
 * @returns Partial user data extracted from claims
 */
export function extractUserFromClaims(
  claims: NiigakiClaims
): Partial<ClaimsUser> {
  const result: Partial<ClaimsUser> = {
    id: claims.sub,
    email: claims.email,
    tenant_id: claims.tenant_id,
    roles: claims.roles as Role[],
    permissions: claims.permissions,
    features: claims.features,
  };

  if (claims.store_id) {
    result.store_id = claims.store_id;
  }
  if (claims.app_id) {
    result.app_id = claims.app_id;
  }
  if (claims.metadata) {
    result.metadata = claims.metadata;
  }

  return result;
}

/**
 * Validate claims structure
 * @param claims - Claims object to validate
 * @returns true if claims are valid
 */
export function validateClaims(claims: unknown): claims is NiigakiClaims {
  if (typeof claims !== 'object' || claims === null) {
    return false;
  }

  const c = claims as Record<string, unknown>;

  return (
    typeof c['sub'] === 'string' &&
    typeof c['email'] === 'string' &&
    typeof c['tenant_id'] === 'string' &&
    Array.isArray(c['roles']) &&
    Array.isArray(c['permissions']) &&
    Array.isArray(c['features']) &&
    typeof c['iat'] === 'number' &&
    typeof c['exp'] === 'number'
  );
}

/**
 * Check if claims are expired
 * @param claims - Claims to check
 * @returns true if claims are expired
 */
export function isExpired(claims: NiigakiClaims): boolean {
  const now = Math.floor(Date.now() / 1000);
  return claims.exp < now;
}

/**
 * JWT Claims module export object
 */
export const jwtClaims = {
  buildClaims,
  buildSupabaseClaims,
  extractUserFromClaims,
  validateClaims,
  isExpired,
};
