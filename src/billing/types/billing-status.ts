/**
 * Billing Status Types
 * Defines the billing status states for tenants.
 */

/**
 * Billing status enum representing the subscription/payment state of a tenant.
 */
export enum BillingStatus {
  /** Tenant is in a trial period */
  TRIAL = 'trial',
  /** Tenant has an active subscription and is paying */
  ACTIVE = 'active',
  /** Payment is pending, waiting for first payment confirmation */
  PENDING_PAYMENT = 'pending_payment',
  /** Payment is overdue but tenant still has limited access */
  OVERDUE = 'overdue',
  /** Tenant is suspended due to prolonged non-payment */
  SUSPENDED = 'suspended',
  /** Subscription has been canceled */
  CANCELED = 'canceled',
}

/**
 * Type guard to check if a string is a valid BillingStatus.
 * @param value - The value to check
 * @returns true if the value is a valid BillingStatus
 */
export function isBillingStatus(value: unknown): value is BillingStatus {
  return Object.values(BillingStatus).includes(value as BillingStatus);
}

/**
 * Billing status transitions map - defines valid transitions.
 */
export const billingStatusTransitions: Record<BillingStatus, BillingStatus[]> = {
  [BillingStatus.TRIAL]: [BillingStatus.ACTIVE, BillingStatus.PENDING_PAYMENT, BillingStatus.CANCELED],
  [BillingStatus.PENDING_PAYMENT]: [BillingStatus.ACTIVE, BillingStatus.OVERDUE, BillingStatus.CANCELED],
  [BillingStatus.ACTIVE]: [BillingStatus.OVERDUE, BillingStatus.CANCELED],
  [BillingStatus.OVERDUE]: [BillingStatus.ACTIVE, BillingStatus.SUSPENDED, BillingStatus.CANCELED],
  [BillingStatus.SUSPENDED]: [BillingStatus.ACTIVE, BillingStatus.CANCELED],
  [BillingStatus.CANCELED]: [],
};

/**
 * Check if a billing status transition is valid.
 * @param from - Current status
 * @param to - Target status
 * @returns true if the transition is allowed
 */
export function isValidTransition(from: BillingStatus, to: BillingStatus): boolean {
  const allowedTransitions = billingStatusTransitions[from];
  return allowedTransitions?.includes(to) ?? false;
}

/**
 * Check if a billing status allows full access to the system.
 * @param status - Billing status to check
 * @returns true if full access is allowed
 */
export function hasFullAccess(status: BillingStatus): boolean {
  return status === BillingStatus.ACTIVE || status === BillingStatus.TRIAL;
}

/**
 * Check if a billing status allows limited access to the system.
 * @param status - Billing status to check
 * @returns true if limited access is allowed
 */
export function hasLimitedAccess(status: BillingStatus): boolean {
  return status === BillingStatus.OVERDUE || status === BillingStatus.PENDING_PAYMENT;
}

/**
 * Check if a billing status allows any access to the system.
 * @param status - Billing status to check
 * @returns true if any access is allowed
 */
export function hasAnyAccess(status: BillingStatus): boolean {
  return hasFullAccess(status) || hasLimitedAccess(status);
}

/**
 * Billing status module export
 */
export const billingStatus = {
  BillingStatus,
  isBillingStatus,
  isValidTransition,
  hasFullAccess,
  hasLimitedAccess,
  hasAnyAccess,
  billingStatusTransitions,
};
