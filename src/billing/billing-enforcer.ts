/**
 * Billing Enforcer
 * Enforcement utilities for billing-based access control.
 */

import {
  BillingStatus,
  hasFullAccess,
  hasLimitedAccess,
  hasAnyAccess,
} from './types/billing-status';
import { BillingStatusInvalidError } from './billing-errors';
import { GetTenantBillingCallback } from './subscription-service';

/**
 * Billing enforcement context for ABAC policies.
 */
export interface BillingContext {
  tenantId: string;
  billingStatus: BillingStatus;
  subscriptionActive: boolean;
  inTrial: boolean;
  isOverdue: boolean;
  isSuspended: boolean;
  daysOverdue?: number | undefined;
}

/**
 * Billing enforcer configuration.
 */
export interface BillingEnforcerConfig {
  /** Callback to get tenant billing data */
  getTenantBilling: GetTenantBillingCallback;
  /** Whether to throw errors or return false on access denial */
  throwOnDenial?: boolean;
}

/**
 * Billing Enforcer class.
 * Provides methods for enforcing billing-based access control.
 */
export class BillingEnforcer {
  private readonly config: BillingEnforcerConfig;

  constructor(config: BillingEnforcerConfig) {
    this.config = {
      ...config,
      throwOnDenial: config.throwOnDenial ?? true,
    };
  }

  /**
   * Get billing context for a tenant.
   * @param tenantId - Tenant ID
   * @returns Billing context
   */
  async getBillingContext(tenantId: string): Promise<BillingContext | null> {
    const billing = await this.config.getTenantBilling(tenantId);
    if (!billing) {
      return null;
    }

    const context: BillingContext = {
      tenantId: billing.id,
      billingStatus: billing.billingStatus,
      subscriptionActive: hasFullAccess(billing.billingStatus),
      inTrial: billing.billingStatus === BillingStatus.TRIAL,
      isOverdue: billing.billingStatus === BillingStatus.OVERDUE,
      isSuspended: billing.billingStatus === BillingStatus.SUSPENDED || billing.billingStatus === BillingStatus.CANCELED,
    };

    if (billing.subscriptionMetadata?.daysOverdue !== undefined) {
      context.daysOverdue = billing.subscriptionMetadata.daysOverdue;
    }

    return context;
  }

  /**
   * Require tenant to have an active billing status.
   * @param tenantId - Tenant ID
   * @returns true if active
   * @throws BillingStatusInvalidError if not active and throwOnDenial is true
   */
  async requireActive(tenantId: string): Promise<boolean> {
    const billing = await this.config.getTenantBilling(tenantId);
    if (!billing) {
      return this.handleDenial(
        BillingStatus.CANCELED,
        'Tenant not found',
        [BillingStatus.ACTIVE]
      );
    }

    if (!hasFullAccess(billing.billingStatus)) {
      return this.handleDenial(
        billing.billingStatus,
        `Tenant billing status is '${billing.billingStatus}', but 'active' or 'trial' is required`,
        [BillingStatus.ACTIVE, BillingStatus.TRIAL]
      );
    }

    return true;
  }

  /**
   * Check if tenant is in trial period.
   * @param tenantId - Tenant ID
   * @returns true if in trial
   */
  async inTrial(tenantId: string): Promise<boolean> {
    const billing = await this.config.getTenantBilling(tenantId);
    return billing?.billingStatus === BillingStatus.TRIAL;
  }

  /**
   * Require tenant to have any access (not suspended/canceled).
   * @param tenantId - Tenant ID
   * @returns true if has any access
   * @throws BillingStatusInvalidError if suspended/canceled and throwOnDenial is true
   */
  async requireAnyAccess(tenantId: string): Promise<boolean> {
    const billing = await this.config.getTenantBilling(tenantId);
    if (!billing) {
      return this.handleDenial(
        BillingStatus.CANCELED,
        'Tenant not found',
        [BillingStatus.ACTIVE, BillingStatus.TRIAL, BillingStatus.OVERDUE, BillingStatus.PENDING_PAYMENT]
      );
    }

    if (!hasAnyAccess(billing.billingStatus)) {
      return this.handleDenial(
        billing.billingStatus,
        `Tenant access is denied due to billing status '${billing.billingStatus}'`,
        [BillingStatus.ACTIVE, BillingStatus.TRIAL, BillingStatus.OVERDUE, BillingStatus.PENDING_PAYMENT]
      );
    }

    return true;
  }

  /**
   * Check if tenant has limited access only (overdue or pending payment).
   * @param tenantId - Tenant ID
   * @returns true if has limited access only
   */
  async hasLimitedAccessOnly(tenantId: string): Promise<boolean> {
    const billing = await this.config.getTenantBilling(tenantId);
    return billing ? hasLimitedAccess(billing.billingStatus) : false;
  }

  /**
   * Check if tenant is suspended or canceled.
   * @param tenantId - Tenant ID
   * @returns true if suspended or canceled
   */
  async isSuspendedOrCanceled(tenantId: string): Promise<boolean> {
    const billing = await this.config.getTenantBilling(tenantId);
    if (!billing) {
      return true;
    }
    return billing.billingStatus === BillingStatus.SUSPENDED || billing.billingStatus === BillingStatus.CANCELED;
  }

  /**
   * Get tenant billing status.
   * @param tenantId - Tenant ID
   * @returns Billing status or null
   */
  async getBillingStatus(tenantId: string): Promise<BillingStatus | null> {
    const billing = await this.config.getTenantBilling(tenantId);
    return billing?.billingStatus ?? null;
  }

  /**
   * Handle access denial based on configuration.
   * @param currentStatus - Current billing status
   * @param message - Error message
   * @param requiredStatus - Required status(es)
   * @returns false if throwOnDenial is false
   * @throws BillingStatusInvalidError if throwOnDenial is true
   */
  private handleDenial(
    currentStatus: BillingStatus,
    message: string,
    requiredStatus?: BillingStatus[]
  ): boolean {
    if (this.config.throwOnDenial) {
      throw new BillingStatusInvalidError(currentStatus, message, requiredStatus);
    }
    return false;
  }

  // ============================================
  // Static ABAC Policy Functions
  // ============================================

  /**
   * Create an ABAC policy function that checks for active billing status.
   * @param getBillingCallback - Callback to get billing data
   * @returns Policy function
   */
  static createActiveBillingPolicy(getBillingCallback: GetTenantBillingCallback) {
    return async (user: { tenant_id?: string }): Promise<boolean> => {
      if (!user.tenant_id) {
        return false;
      }
      const billing = await getBillingCallback(user.tenant_id);
      return billing ? hasFullAccess(billing.billingStatus) : false;
    };
  }

  /**
   * Create an ABAC policy function that checks for any access.
   * @param getBillingCallback - Callback to get billing data
   * @returns Policy function
   */
  static createAnyAccessBillingPolicy(getBillingCallback: GetTenantBillingCallback) {
    return async (user: { tenant_id?: string }): Promise<boolean> => {
      if (!user.tenant_id) {
        return false;
      }
      const billing = await getBillingCallback(user.tenant_id);
      return billing ? hasAnyAccess(billing.billingStatus) : false;
    };
  }

  /**
   * Create an ABAC policy function that checks for trial status.
   * @param getBillingCallback - Callback to get billing data
   * @returns Policy function
   */
  static createTrialBillingPolicy(getBillingCallback: GetTenantBillingCallback) {
    return async (user: { tenant_id?: string }): Promise<boolean> => {
      if (!user.tenant_id) {
        return false;
      }
      const billing = await getBillingCallback(user.tenant_id);
      return billing?.billingStatus === BillingStatus.TRIAL;
    };
  }
}

/**
 * Create a new BillingEnforcer instance.
 * @param config - Enforcer configuration
 * @returns BillingEnforcer instance
 */
export function createBillingEnforcer(config: BillingEnforcerConfig): BillingEnforcer {
  return new BillingEnforcer(config);
}

/**
 * Billing enforcer module export
 */
export const billingEnforcer = {
  BillingEnforcer,
  createBillingEnforcer,
};
