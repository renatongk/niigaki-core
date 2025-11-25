/**
 * Billing Plan Types
 * Defines subscription plan structures and metadata.
 */

/**
 * Billing cycle options for subscriptions.
 */
export enum BillingCycle {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMIANNUALLY = 'SEMIANNUALLY',
  YEARLY = 'YEARLY',
}

/**
 * Billing plan structure.
 */
export interface BillingPlan {
  /** Unique plan identifier */
  id: string;
  /** Plan name */
  name: string;
  /** Plan description */
  description: string;
  /** Price in cents (to avoid floating point issues) */
  priceInCents: number;
  /** Currency code (e.g., 'BRL') */
  currency: string;
  /** Billing cycle */
  cycle: BillingCycle;
  /** Trial days offered with this plan */
  trialDays: number;
  /** Plan features included */
  features: string[];
  /** Plan metadata for additional information */
  metadata: Record<string, unknown>;
  /** Whether the plan is currently active/available */
  active: boolean;
}

/**
 * Subscription metadata stored with tenant.
 */
export interface SubscriptionMetadata {
  /** Current plan ID */
  planId: string;
  /** Plan name for display */
  planName: string;
  /** Price at time of subscription */
  priceInCents: number;
  /** Currency at time of subscription */
  currency: string;
  /** Billing cycle */
  cycle: BillingCycle;
  /** Trial end date if applicable */
  trialEndDate?: Date;
  /** Next billing date */
  nextBillingDate?: Date;
  /** Last payment date */
  lastPaymentDate?: Date;
  /** Days overdue (if any) */
  daysOverdue?: number;
  /** Additional custom metadata */
  custom: Record<string, unknown>;
}

/**
 * Type guard to check if a string is a valid BillingCycle.
 * @param value - The value to check
 * @returns true if the value is a valid BillingCycle
 */
export function isBillingCycle(value: unknown): value is BillingCycle {
  return Object.values(BillingCycle).includes(value as BillingCycle);
}

/**
 * Get the number of days in a billing cycle.
 * @param cycle - The billing cycle
 * @returns Approximate number of days
 */
export function getBillingCycleDays(cycle: BillingCycle): number {
  switch (cycle) {
    case BillingCycle.WEEKLY:
      return 7;
    case BillingCycle.BIWEEKLY:
      return 14;
    case BillingCycle.MONTHLY:
      return 30;
    case BillingCycle.QUARTERLY:
      return 90;
    case BillingCycle.SEMIANNUALLY:
      return 180;
    case BillingCycle.YEARLY:
      return 365;
  }
}

/**
 * Create default subscription metadata.
 * @param plan - The billing plan
 * @returns Default subscription metadata
 */
export function createDefaultSubscriptionMetadata(plan: BillingPlan): SubscriptionMetadata {
  return {
    planId: plan.id,
    planName: plan.name,
    priceInCents: plan.priceInCents,
    currency: plan.currency,
    cycle: plan.cycle,
    custom: {},
  };
}

/**
 * Billing plan module export
 */
export const billingPlan = {
  BillingCycle,
  isBillingCycle,
  getBillingCycleDays,
  createDefaultSubscriptionMetadata,
};
