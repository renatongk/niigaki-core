/**
 * Attribute-Based Access Control (ABAC) Module
 * Provides flexible policy-based access control based on user and resource attributes.
 */

/**
 * Represents a user in the ABAC system
 */
export interface AbacUser {
  id: string;
  tenant_id: string;
  store_id?: string;
  roles: string[];
  permissions: string[];
  attributes: Record<string, unknown>;
}

/**
 * Represents a resource in the ABAC system
 */
export interface AbacResource {
  id: string;
  type: string;
  tenant_id: string;
  store_id?: string;
  owner_id?: string;
  attributes: Record<string, unknown>;
}

/**
 * Context for policy evaluation
 */
export interface AbacContext {
  user: AbacUser;
  resource: AbacResource;
  action: string;
  environment?: Record<string, unknown> | undefined;
}

/**
 * Policy function type - returns true if access is allowed
 */
export type PolicyFunction = (context: AbacContext) => boolean;

/**
 * Policy definition
 */
export interface Policy {
  name: string;
  description: string;
  condition: PolicyFunction;
}

/**
 * Policy evaluation result
 */
export interface PolicyResult {
  allowed: boolean;
  policy: string;
  reason: string;
}

/**
 * Built-in policies for common scenarios
 */
export const builtInPolicies: Policy[] = [
  {
    name: 'same_tenant',
    description: 'User must belong to the same tenant as the resource',
    condition: (ctx: AbacContext): boolean =>
      ctx.user.tenant_id === ctx.resource.tenant_id,
  },
  {
    name: 'same_store',
    description: 'User must belong to the same store as the resource',
    condition: (ctx: AbacContext): boolean =>
      ctx.user.store_id !== undefined &&
      ctx.user.store_id === ctx.resource.store_id,
  },
  {
    name: 'is_owner',
    description: 'User must be the owner of the resource',
    condition: (ctx: AbacContext): boolean =>
      ctx.user.id === ctx.resource.owner_id,
  },
  {
    name: 'has_permission',
    description: 'User must have the required permission for the action',
    condition: (ctx: AbacContext): boolean =>
      ctx.user.permissions.includes(ctx.action) ||
      ctx.user.permissions.includes(`${ctx.action}:${ctx.resource.type}`),
  },
];

/**
 * Policy registry for managing custom policies
 */
class PolicyRegistry {
  private policies: Map<string, Policy> = new Map();

  constructor() {
    // Register built-in policies
    for (const policy of builtInPolicies) {
      this.register(policy);
    }
  }

  /**
   * Register a new policy
   */
  register(policy: Policy): void {
    this.policies.set(policy.name, policy);
  }

  /**
   * Get a policy by name
   */
  get(name: string): Policy | undefined {
    return this.policies.get(name);
  }

  /**
   * Get all registered policies
   */
  getAll(): Policy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Remove a policy
   */
  remove(name: string): boolean {
    return this.policies.delete(name);
  }
}

/**
 * Global policy registry instance
 */
const registry = new PolicyRegistry();

/**
 * Evaluate a single policy
 * @param resource - The resource being accessed
 * @param user - The user requesting access
 * @param policy - The policy to evaluate (name or Policy object)
 * @param action - The action being performed
 * @param environment - Optional environment context
 * @returns PolicyResult with the evaluation outcome
 */
export function evaluate(
  resource: AbacResource,
  user: AbacUser,
  policy: string | Policy | PolicyFunction,
  action: string = 'access',
  environment?: Record<string, unknown>
): PolicyResult {
  const context: AbacContext = {
    user,
    resource,
    action,
    environment,
  };

  let policyObj: Policy | undefined;
  let policyName: string;
  let condition: PolicyFunction;

  if (typeof policy === 'string') {
    policyObj = registry.get(policy);
    if (!policyObj) {
      return {
        allowed: false,
        policy: policy,
        reason: `Policy '${policy}' not found`,
      };
    }
    policyName = policyObj.name;
    condition = policyObj.condition;
  } else if (typeof policy === 'function') {
    policyName = 'custom_function';
    condition = policy;
  } else {
    policyName = policy.name;
    condition = policy.condition;
  }

  try {
    const allowed = condition(context);
    return {
      allowed,
      policy: policyName,
      reason: allowed
        ? `Access granted by policy '${policyName}'`
        : `Access denied by policy '${policyName}'`,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return {
      allowed: false,
      policy: policyName,
      reason: `Policy evaluation failed: ${errorMessage}`,
    };
  }
}

/**
 * Evaluate multiple policies - ALL must pass (AND logic)
 * @param resource - The resource being accessed
 * @param user - The user requesting access
 * @param policies - Array of policy names or Policy objects
 * @param action - The action being performed
 * @param environment - Optional environment context
 * @returns Array of PolicyResults
 */
export function evaluateAll(
  resource: AbacResource,
  user: AbacUser,
  policies: (string | Policy)[],
  action: string = 'access',
  environment?: Record<string, unknown>
): PolicyResult[] {
  return policies.map((policy) =>
    evaluate(resource, user, policy, action, environment)
  );
}

/**
 * Check if all policies pass
 */
export function checkAll(
  resource: AbacResource,
  user: AbacUser,
  policies: (string | Policy)[],
  action: string = 'access',
  environment?: Record<string, unknown>
): boolean {
  const results = evaluateAll(resource, user, policies, action, environment);
  return results.every((r) => r.allowed);
}

/**
 * Check if any policy passes
 */
export function checkAny(
  resource: AbacResource,
  user: AbacUser,
  policies: (string | Policy)[],
  action: string = 'access',
  environment?: Record<string, unknown>
): boolean {
  const results = evaluateAll(resource, user, policies, action, environment);
  return results.some((r) => r.allowed);
}

/**
 * Register a custom policy
 */
export function registerPolicy(policy: Policy): void {
  registry.register(policy);
}

/**
 * Create a policy from a condition function
 */
export function createPolicy(
  name: string,
  description: string,
  condition: PolicyFunction
): Policy {
  return { name, description, condition };
}

/**
 * ABAC module export object
 */
export const abac = {
  evaluate,
  evaluateAll,
  checkAll,
  checkAny,
  registerPolicy,
  createPolicy,
  builtInPolicies,
};
