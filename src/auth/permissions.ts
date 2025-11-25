/**
 * Permissions Module
 * Centralized permission definitions and utilities.
 */

import { Action, Role, can, getAllPermissions } from './rbac';

/**
 * Permission scope for resource-level access
 */
export enum PermissionScope {
  /** System-wide access */
  SYSTEM = 'system',
  /** Tenant-level access */
  TENANT = 'tenant',
  /** Store-level access */
  STORE = 'store',
  /** Own resources only */
  OWN = 'own',
}

/**
 * Permission definition with scope
 */
export interface Permission {
  action: Action;
  scope: PermissionScope;
  resource?: string | undefined;
}

/**
 * Permission check context
 */
export interface PermissionContext {
  user_id: string;
  tenant_id: string;
  store_id?: string;
  roles: Role[];
}

/**
 * Resource context for permission checking
 */
export interface ResourceContext {
  tenant_id: string;
  store_id?: string;
  owner_id?: string;
}

/**
 * Check if user has permission to access a resource
 * @param userCtx - User permission context
 * @param resourceCtx - Resource context
 * @param action - Action to check
 * @returns true if user has permission
 */
export function hasPermission(
  userCtx: PermissionContext,
  resourceCtx: ResourceContext,
  action: Action
): boolean {
  // First check if any role allows the action
  const hasRolePermission = userCtx.roles.some((role) => can(role, action));
  if (!hasRolePermission) {
    return false;
  }

  // Check tenant scope
  if (userCtx.tenant_id !== resourceCtx.tenant_id) {
    // Only system admin can cross tenant boundaries
    return userCtx.roles.includes(Role.SYSTEM_ADMIN);
  }

  // Check store scope if applicable
  if (resourceCtx.store_id && userCtx.store_id) {
    if (userCtx.store_id !== resourceCtx.store_id) {
      // Tenant admin and above can access across stores
      return (
        userCtx.roles.includes(Role.TENANT_ADMIN) ||
        userCtx.roles.includes(Role.APP_ADMIN) ||
        userCtx.roles.includes(Role.SYSTEM_ADMIN)
      );
    }
  }

  return true;
}

/**
 * Check if user owns a resource
 * @param userCtx - User permission context
 * @param resourceCtx - Resource context
 * @returns true if user owns the resource
 */
export function isResourceOwner(
  userCtx: PermissionContext,
  resourceCtx: ResourceContext
): boolean {
  return resourceCtx.owner_id === userCtx.user_id;
}

/**
 * Get effective permissions for a user
 * @param roles - User roles
 * @returns Array of action strings
 */
export function getEffectivePermissions(roles: Role[]): string[] {
  return getAllPermissions(roles);
}

/**
 * Format permission as string
 * @param action - Action
 * @param scope - Scope
 * @param resource - Optional resource type
 * @returns Formatted permission string
 */
export function formatPermission(
  action: Action,
  scope: PermissionScope,
  resource?: string
): string {
  let result = `${action}:${scope}`;
  if (resource) {
    result += `:${resource}`;
  }
  return result;
}

/**
 * Parse permission string
 * @param permission - Permission string
 * @returns Parsed permission or null if invalid
 */
export function parsePermission(permission: string): Permission | null {
  const parts = permission.split(':');
  if (parts.length < 2) {
    return null;
  }

  const action = parts[0] as Action;
  const scope = parts[1] as PermissionScope;

  if (!Object.values(Action).includes(action)) {
    return null;
  }
  if (!Object.values(PermissionScope).includes(scope)) {
    return null;
  }

  const result: Permission = {
    action,
    scope,
  };

  if (parts[2]) {
    result.resource = parts[2];
  }

  return result;
}

/**
 * Permissions module export object
 */
export const permissions = {
  PermissionScope,
  hasPermission,
  isResourceOwner,
  getEffectivePermissions,
  formatPermission,
  parsePermission,
};
