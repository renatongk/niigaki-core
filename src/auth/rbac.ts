/**
 * Role-Based Access Control (RBAC) Module
 * Defines roles, permissions, and access control functions for the Niigaki platform.
 */

/**
 * System roles hierarchy from most to least privileged
 */
export enum Role {
  /** Full system access - can manage all tenants and system settings */
  SYSTEM_ADMIN = 'system_admin',
  /** Application-level admin - can manage app configuration across tenants */
  APP_ADMIN = 'app_admin',
  /** Tenant-level admin - can manage all stores within their tenant */
  TENANT_ADMIN = 'tenant_admin',
  /** Store manager - can manage their assigned store */
  STORE_MANAGER = 'store_manager',
  /** Store employee - basic access to store operations */
  STORE_EMPLOYEE = 'store_employee',
}

/**
 * Available actions/permissions in the system
 */
export enum Action {
  // System-level actions
  MANAGE_SYSTEM = 'manage_system',
  VIEW_SYSTEM_LOGS = 'view_system_logs',

  // Tenant actions
  MANAGE_TENANTS = 'manage_tenants',
  VIEW_TENANTS = 'view_tenants',
  CREATE_TENANT = 'create_tenant',
  DELETE_TENANT = 'delete_tenant',

  // Store actions
  MANAGE_STORES = 'manage_stores',
  VIEW_STORES = 'view_stores',
  CREATE_STORE = 'create_store',
  DELETE_STORE = 'delete_store',

  // User management
  MANAGE_USERS = 'manage_users',
  VIEW_USERS = 'view_users',
  CREATE_USER = 'create_user',
  DELETE_USER = 'delete_user',

  // Product actions
  MANAGE_PRODUCTS = 'manage_products',
  VIEW_PRODUCTS = 'view_products',
  CREATE_PRODUCT = 'create_product',
  DELETE_PRODUCT = 'delete_product',

  // Order actions
  MANAGE_ORDERS = 'manage_orders',
  VIEW_ORDERS = 'view_orders',
  CREATE_ORDER = 'create_order',
  CANCEL_ORDER = 'cancel_order',

  // Report actions
  VIEW_REPORTS = 'view_reports',
  EXPORT_REPORTS = 'export_reports',

  // Settings
  MANAGE_SETTINGS = 'manage_settings',
  VIEW_SETTINGS = 'view_settings',
}

/**
 * Permission map defining which roles can perform which actions
 */
const rolePermissions: Record<Role, Action[]> = {
  [Role.SYSTEM_ADMIN]: Object.values(Action),
  [Role.APP_ADMIN]: [
    Action.MANAGE_TENANTS,
    Action.VIEW_TENANTS,
    Action.CREATE_TENANT,
    Action.MANAGE_STORES,
    Action.VIEW_STORES,
    Action.CREATE_STORE,
    Action.DELETE_STORE,
    Action.MANAGE_USERS,
    Action.VIEW_USERS,
    Action.CREATE_USER,
    Action.DELETE_USER,
    Action.MANAGE_PRODUCTS,
    Action.VIEW_PRODUCTS,
    Action.CREATE_PRODUCT,
    Action.DELETE_PRODUCT,
    Action.MANAGE_ORDERS,
    Action.VIEW_ORDERS,
    Action.CREATE_ORDER,
    Action.CANCEL_ORDER,
    Action.VIEW_REPORTS,
    Action.EXPORT_REPORTS,
    Action.MANAGE_SETTINGS,
    Action.VIEW_SETTINGS,
  ],
  [Role.TENANT_ADMIN]: [
    Action.VIEW_TENANTS,
    Action.MANAGE_STORES,
    Action.VIEW_STORES,
    Action.CREATE_STORE,
    Action.DELETE_STORE,
    Action.MANAGE_USERS,
    Action.VIEW_USERS,
    Action.CREATE_USER,
    Action.DELETE_USER,
    Action.MANAGE_PRODUCTS,
    Action.VIEW_PRODUCTS,
    Action.CREATE_PRODUCT,
    Action.DELETE_PRODUCT,
    Action.MANAGE_ORDERS,
    Action.VIEW_ORDERS,
    Action.CREATE_ORDER,
    Action.CANCEL_ORDER,
    Action.VIEW_REPORTS,
    Action.EXPORT_REPORTS,
    Action.MANAGE_SETTINGS,
    Action.VIEW_SETTINGS,
  ],
  [Role.STORE_MANAGER]: [
    Action.VIEW_STORES,
    Action.VIEW_USERS,
    Action.CREATE_USER,
    Action.MANAGE_PRODUCTS,
    Action.VIEW_PRODUCTS,
    Action.CREATE_PRODUCT,
    Action.DELETE_PRODUCT,
    Action.MANAGE_ORDERS,
    Action.VIEW_ORDERS,
    Action.CREATE_ORDER,
    Action.CANCEL_ORDER,
    Action.VIEW_REPORTS,
    Action.EXPORT_REPORTS,
    Action.VIEW_SETTINGS,
  ],
  [Role.STORE_EMPLOYEE]: [
    Action.VIEW_PRODUCTS,
    Action.VIEW_ORDERS,
    Action.CREATE_ORDER,
    Action.VIEW_SETTINGS,
  ],
};

/**
 * Check if a role can perform a specific action
 * @param role - The role to check
 * @param action - The action to verify permission for
 * @returns true if the role has permission, false otherwise
 */
export function can(role: Role, action: Action): boolean {
  const permissions = rolePermissions[role];
  if (!permissions) {
    return false;
  }
  return permissions.includes(action);
}

/**
 * Check if any of the given roles can perform a specific action
 * @param roles - Array of roles to check
 * @param action - The action to verify permission for
 * @returns true if any role has permission, false otherwise
 */
export function canAny(roles: Role[], action: Action): boolean {
  return roles.some((role) => can(role, action));
}

/**
 * Get all permissions for a given role
 * @param role - The role to get permissions for
 * @returns Array of actions the role can perform
 */
export function getPermissions(role: Role): Action[] {
  return rolePermissions[role] ?? [];
}

/**
 * Get all permissions for multiple roles (union of all permissions)
 * @param roles - Array of roles
 * @returns Array of unique actions across all roles
 */
export function getAllPermissions(roles: Role[]): Action[] {
  const allPermissions = new Set<Action>();
  for (const role of roles) {
    const permissions = getPermissions(role);
    for (const permission of permissions) {
      allPermissions.add(permission);
    }
  }
  return Array.from(allPermissions);
}

/**
 * Check if a role has a higher privilege level than another
 * @param role - The role to check
 * @param comparedTo - The role to compare against
 * @returns true if role has higher privilege
 */
export function hasHigherPrivilege(role: Role, comparedTo: Role): boolean {
  const hierarchy: Role[] = [
    Role.SYSTEM_ADMIN,
    Role.APP_ADMIN,
    Role.TENANT_ADMIN,
    Role.STORE_MANAGER,
    Role.STORE_EMPLOYEE,
  ];

  const roleIndex = hierarchy.indexOf(role);
  const comparedIndex = hierarchy.indexOf(comparedTo);

  return roleIndex !== -1 && comparedIndex !== -1 && roleIndex < comparedIndex;
}

/**
 * RBAC module export object
 */
export const rbac = {
  Role,
  Action,
  can,
  canAny,
  getPermissions,
  getAllPermissions,
  hasHigherPrivilege,
};
