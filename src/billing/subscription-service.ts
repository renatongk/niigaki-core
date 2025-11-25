/**
 * Subscription Service
 * Manages subscription lifecycle for tenants.
 */

import { logger } from '../logging/logger';
import { AsaasClient } from './asaas-client';
import { BillingStatus, isValidTransition } from './types/billing-status';
import { SubscriptionMetadata, createDefaultSubscriptionMetadata, BillingPlan } from './types/billing-plan';
import { CreateSubscriptionDto, AsaasBillingType, AsaasSubscriptionResponse } from './dtos/subscription.dto';
import {
  SubscriptionCreationError,
  SubscriptionCancellationError,
  InvalidBillingTransitionError,
  BillingStatusInvalidError,
} from './billing-errors';

/**
 * Tenant billing data structure.
 * This interface represents the billing-related fields that a tenant should have.
 */
export interface TenantBillingData {
  id: string;
  asaasCustomerId?: string | undefined;
  asaasSubscriptionId?: string | undefined;
  billingStatus: BillingStatus;
  subscriptionMetadata?: SubscriptionMetadata | undefined;
}

/**
 * Callback for updating tenant billing data in the database.
 */
export type UpdateTenantBillingCallback = (
  tenantId: string,
  data: Partial<TenantBillingData>
) => Promise<void>;

/**
 * Callback for retrieving tenant billing data from the database.
 */
export type GetTenantBillingCallback = (tenantId: string) => Promise<TenantBillingData | null>;

/**
 * Subscription service configuration.
 */
export interface SubscriptionServiceConfig {
  /** ASAAS client instance */
  asaasClient: AsaasClient;
  /** Callback to update tenant billing data */
  updateTenantBilling: UpdateTenantBillingCallback;
  /** Callback to get tenant billing data */
  getTenantBilling: GetTenantBillingCallback;
  /** Default billing type for subscriptions */
  defaultBillingType?: AsaasBillingType | undefined;
  /** Days to consider for suspension after overdue */
  daysUntilSuspension?: number | undefined;
}

/**
 * Options for initializing a subscription.
 */
export interface InitializeSubscriptionOptions {
  /** Tenant ID */
  tenantId: string;
  /** ASAAS customer ID */
  customerId: string;
  /** Billing plan to subscribe to */
  plan: BillingPlan;
  /** Billing type override */
  billingType?: AsaasBillingType | undefined;
  /** External reference override */
  externalReference?: string | undefined;
  /** Start with trial period */
  startWithTrial?: boolean | undefined;
}

/**
 * Result of subscription initialization.
 */
export interface InitializeSubscriptionResult {
  subscriptionId: string;
  billingStatus: BillingStatus;
  metadata: SubscriptionMetadata;
}

/**
 * Subscription Service class.
 * Handles subscription lifecycle operations.
 */
export class SubscriptionService {
  private readonly config: SubscriptionServiceConfig;

  constructor(config: SubscriptionServiceConfig) {
    this.config = {
      ...config,
      defaultBillingType: config.defaultBillingType ?? 'BOLETO',
      daysUntilSuspension: config.daysUntilSuspension ?? 15,
    };
  }

  /**
   * Initialize a subscription for a tenant.
   * @param options - Subscription initialization options
   * @returns Subscription result
   */
  async initializeSubscriptionForTenant(options: InitializeSubscriptionOptions): Promise<InitializeSubscriptionResult> {
    const operation = 'subscription.initialize';
    logger.start(operation, { tenantId: options.tenantId, planId: options.plan.id });

    try {
      // Calculate next due date
      const nextDueDate = options.startWithTrial && options.plan.trialDays > 0
        ? this.calculateDateFromNow(options.plan.trialDays)
        : this.calculateDateFromNow(0);

      // Create subscription in ASAAS
      const subscriptionData: CreateSubscriptionDto = {
        customer: options.customerId,
        billingType: options.billingType ?? this.config.defaultBillingType ?? 'BOLETO',
        value: options.plan.priceInCents / 100, // Convert cents to currency unit
        nextDueDate: this.formatDate(nextDueDate),
        cycle: options.plan.cycle,
        description: `Subscription: ${options.plan.name}`,
        externalReference: options.externalReference ?? options.tenantId,
      };

      const subscription = await this.config.asaasClient.createSubscription(subscriptionData);

      // Determine initial billing status
      const billingStatus = options.startWithTrial && options.plan.trialDays > 0
        ? BillingStatus.TRIAL
        : BillingStatus.PENDING_PAYMENT;

      // Create subscription metadata
      const metadata = createDefaultSubscriptionMetadata(options.plan);
      if (options.startWithTrial && options.plan.trialDays > 0) {
        metadata.trialEndDate = nextDueDate;
      }
      metadata.nextBillingDate = nextDueDate;

      // Update tenant billing data
      await this.config.updateTenantBilling(options.tenantId, {
        asaasSubscriptionId: subscription.id,
        billingStatus,
        subscriptionMetadata: metadata,
      });

      logger.end(operation, {
        tenantId: options.tenantId,
        subscriptionId: subscription.id,
        billingStatus,
      });

      return {
        subscriptionId: subscription.id,
        billingStatus,
        metadata,
      };
    } catch (error) {
      logger.error(operation, { tenantId: options.tenantId }, error instanceof Error ? error : new Error(String(error)));

      if (error instanceof SubscriptionCreationError) {
        throw error;
      }

      const errorOptions: { cause?: Error } = {};
      if (error instanceof Error) {
        errorOptions.cause = error;
      }

      throw new SubscriptionCreationError(
        options.tenantId,
        options.customerId,
        `Failed to initialize subscription: ${error instanceof Error ? error.message : String(error)}`,
        errorOptions
      );
    }
  }

  /**
   * Cancel a subscription for a tenant.
   * @param tenantId - Tenant ID
   * @returns void
   */
  async cancelSubscription(tenantId: string): Promise<void> {
    const operation = 'subscription.cancel';
    logger.start(operation, { tenantId });

    try {
      const tenantBilling = await this.config.getTenantBilling(tenantId);

      if (!tenantBilling) {
        throw new SubscriptionCancellationError('unknown', 'Tenant not found');
      }

      if (!tenantBilling.asaasSubscriptionId) {
        throw new SubscriptionCancellationError('unknown', 'Tenant has no active subscription');
      }

      // Validate transition
      if (!isValidTransition(tenantBilling.billingStatus, BillingStatus.CANCELED)) {
        throw new InvalidBillingTransitionError(tenantBilling.billingStatus, BillingStatus.CANCELED);
      }

      // Cancel in ASAAS
      await this.config.asaasClient.cancelSubscription(tenantBilling.asaasSubscriptionId);

      // Update tenant billing status
      await this.config.updateTenantBilling(tenantId, {
        billingStatus: BillingStatus.CANCELED,
      });

      logger.end(operation, { tenantId, subscriptionId: tenantBilling.asaasSubscriptionId });
    } catch (error) {
      logger.error(operation, { tenantId }, error instanceof Error ? error : new Error(String(error)));

      if (error instanceof SubscriptionCancellationError || error instanceof InvalidBillingTransitionError) {
        throw error;
      }

      const errorOptions: { cause?: Error } = {};
      if (error instanceof Error) {
        errorOptions.cause = error;
      }

      throw new SubscriptionCancellationError(
        tenantId,
        `Failed to cancel subscription: ${error instanceof Error ? error.message : String(error)}`,
        errorOptions
      );
    }
  }

  /**
   * Sync subscription status from ASAAS.
   * @param tenantId - Tenant ID
   * @returns Updated billing data
   */
  async syncSubscriptionStatus(tenantId: string): Promise<TenantBillingData> {
    const operation = 'subscription.sync';
    logger.start(operation, { tenantId });

    try {
      const tenantBilling = await this.config.getTenantBilling(tenantId);

      if (!tenantBilling) {
        throw new BillingStatusInvalidError(BillingStatus.CANCELED, 'Tenant not found');
      }

      if (!tenantBilling.asaasSubscriptionId) {
        logger.end(operation, { tenantId, synced: false, reason: 'no subscription' });
        return tenantBilling;
      }

      // Get subscription from ASAAS
      const subscription = await this.config.asaasClient.getSubscription(tenantBilling.asaasSubscriptionId);

      // Map ASAAS status to internal status
      const newStatus = this.mapAsaasStatusToBillingStatus(subscription, tenantBilling.billingStatus);

      // Update if status changed
      if (newStatus !== tenantBilling.billingStatus) {
        await this.updateBillingStatus(tenantId, tenantBilling.billingStatus, newStatus);
        tenantBilling.billingStatus = newStatus;
      }

      // Update metadata
      if (tenantBilling.subscriptionMetadata && subscription.nextDueDate) {
        tenantBilling.subscriptionMetadata.nextBillingDate = new Date(subscription.nextDueDate);
        await this.config.updateTenantBilling(tenantId, {
          subscriptionMetadata: tenantBilling.subscriptionMetadata,
        });
      }

      logger.end(operation, { tenantId, status: newStatus });
      return tenantBilling;
    } catch (error) {
      logger.error(operation, { tenantId }, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Handle payment confirmed event.
   * @param tenantId - Tenant ID
   * @param paymentDate - Date of payment
   */
  async handlePaymentConfirmed(tenantId: string, paymentDate: Date): Promise<void> {
    const operation = 'subscription.paymentConfirmed';
    logger.start(operation, { tenantId });

    try {
      const tenantBilling = await this.config.getTenantBilling(tenantId);

      if (!tenantBilling) {
        throw new BillingStatusInvalidError(BillingStatus.CANCELED, 'Tenant not found');
      }

      // Transition to ACTIVE status
      const newStatus = BillingStatus.ACTIVE;
      await this.updateBillingStatus(tenantId, tenantBilling.billingStatus, newStatus);

      // Update metadata with payment date
      if (tenantBilling.subscriptionMetadata) {
        tenantBilling.subscriptionMetadata.lastPaymentDate = paymentDate;
        delete tenantBilling.subscriptionMetadata.daysOverdue;
        await this.config.updateTenantBilling(tenantId, {
          subscriptionMetadata: tenantBilling.subscriptionMetadata,
        });
      }

      logger.end(operation, { tenantId, newStatus });
    } catch (error) {
      logger.error(operation, { tenantId }, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Handle payment overdue event.
   * @param tenantId - Tenant ID
   * @param daysOverdue - Number of days overdue
   */
  async handlePaymentOverdue(tenantId: string, daysOverdue: number): Promise<void> {
    const operation = 'subscription.paymentOverdue';
    logger.start(operation, { tenantId, daysOverdue });

    try {
      const tenantBilling = await this.config.getTenantBilling(tenantId);

      if (!tenantBilling) {
        throw new BillingStatusInvalidError(BillingStatus.CANCELED, 'Tenant not found');
      }

      // Determine new status based on days overdue
      const newStatus = daysOverdue >= (this.config.daysUntilSuspension ?? 15)
        ? BillingStatus.SUSPENDED
        : BillingStatus.OVERDUE;

      // Only update if transitioning to a worse status
      if (tenantBilling.billingStatus !== newStatus) {
        await this.updateBillingStatus(tenantId, tenantBilling.billingStatus, newStatus);
      }

      // Update metadata with days overdue
      if (tenantBilling.subscriptionMetadata) {
        tenantBilling.subscriptionMetadata.daysOverdue = daysOverdue;
        await this.config.updateTenantBilling(tenantId, {
          subscriptionMetadata: tenantBilling.subscriptionMetadata,
        });
      }

      logger.end(operation, { tenantId, newStatus, daysOverdue });
    } catch (error) {
      logger.error(operation, { tenantId, daysOverdue }, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Update billing status with validation.
   * @param tenantId - Tenant ID
   * @param currentStatus - Current billing status
   * @param newStatus - New billing status
   */
  private async updateBillingStatus(
    tenantId: string,
    currentStatus: BillingStatus,
    newStatus: BillingStatus
  ): Promise<void> {
    // Skip if same status
    if (currentStatus === newStatus) {
      return;
    }

    // Validate transition
    if (!isValidTransition(currentStatus, newStatus)) {
      throw new InvalidBillingTransitionError(currentStatus, newStatus);
    }

    await this.config.updateTenantBilling(tenantId, {
      billingStatus: newStatus,
    });
  }

  /**
   * Map ASAAS subscription status to internal billing status.
   * @param subscription - ASAAS subscription
   * @param currentStatus - Current internal status
   * @returns New billing status
   */
  private mapAsaasStatusToBillingStatus(
    subscription: AsaasSubscriptionResponse,
    currentStatus: BillingStatus
  ): BillingStatus {
    if (subscription.deleted) {
      return BillingStatus.CANCELED;
    }

    switch (subscription.status) {
      case 'ACTIVE':
        // If currently in trial or pending, keep that status
        if (currentStatus === BillingStatus.TRIAL || currentStatus === BillingStatus.PENDING_PAYMENT) {
          return currentStatus;
        }
        return BillingStatus.ACTIVE;
      case 'INACTIVE':
        return BillingStatus.SUSPENDED;
      case 'EXPIRED':
        return BillingStatus.CANCELED;
      default:
        return currentStatus;
    }
  }

  /**
   * Calculate a date from now.
   * @param days - Days to add
   * @returns Future date
   */
  private calculateDateFromNow(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  /**
   * Format date as YYYY-MM-DD.
   * @param date - Date to format
   * @returns Formatted date string
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0] ?? '';
  }
}

/**
 * Create a new SubscriptionService instance.
 * @param config - Service configuration
 * @returns SubscriptionService instance
 */
export function createSubscriptionService(config: SubscriptionServiceConfig): SubscriptionService {
  return new SubscriptionService(config);
}

/**
 * Subscription service module export
 */
export const subscriptionService = {
  SubscriptionService,
  createSubscriptionService,
};
