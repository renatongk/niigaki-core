/**
 * Webhook Handler
 * Handles ASAAS webhook events for billing lifecycle.
 */

import { logger } from '../logging/logger';
import { BillingService } from './billing-service';
import { TenantBillingData } from './subscription-service';
import {
  AsaasEventType,
  AsaasWebhookEvent,
  AsaasPaymentPayload,
  AsaasSubscriptionPayload,
  isAsaasEventType,
  isPaymentEvent,
  isSubscriptionEvent,
} from './types/asaas-events';
import { WebhookInvalidError } from './billing-errors';

/**
 * Webhook handler configuration.
 */
export interface WebhookHandlerConfig {
  /** Billing service instance */
  billingService: BillingService;
  /** Callback to get tenant by ASAAS customer ID */
  getTenantByCustomerId: (customerId: string) => Promise<TenantBillingData | null>;
  /** Callback to get tenant by ASAAS subscription ID */
  getTenantBySubscriptionId: (subscriptionId: string) => Promise<TenantBillingData | null>;
  /** Optional webhook access token for validation */
  webhookAccessToken?: string;
  /** Days to consider payment overdue for status changes */
  daysUntilOverdueStatus?: number;
}

/**
 * Webhook event processing result.
 */
export interface WebhookProcessingResult {
  success: boolean;
  eventType: AsaasEventType;
  tenantId?: string;
  action?: string;
  error?: string;
}

/**
 * Webhook Handler class.
 * Processes ASAAS webhook events and updates tenant billing status.
 */
export class WebhookHandler {
  private readonly config: WebhookHandlerConfig;

  constructor(config: WebhookHandlerConfig) {
    this.config = {
      ...config,
      daysUntilOverdueStatus: config.daysUntilOverdueStatus ?? 1,
    };
  }

  /**
   * Validate webhook access token.
   * @param token - Token from request headers
   * @returns true if valid or no token required
   */
  validateAccessToken(token?: string): boolean {
    if (!this.config.webhookAccessToken) {
      return true; // No validation required
    }
    return token === this.config.webhookAccessToken;
  }

  /**
   * Handle a webhook event from ASAAS.
   * @param event - Webhook event payload
   * @param accessToken - Optional access token for validation
   * @returns Processing result
   */
  async handleEvent(
    event: AsaasWebhookEvent,
    accessToken?: string
  ): Promise<WebhookProcessingResult> {
    const operation = 'webhook.handleEvent';
    logger.start(operation, { eventType: event.event });

    try {
      // Validate access token
      if (!this.validateAccessToken(accessToken)) {
        throw new WebhookInvalidError('Invalid webhook access token');
      }

      // Validate event type
      if (!isAsaasEventType(event.event)) {
        throw new WebhookInvalidError(`Unknown event type: ${event.event}`, event.event);
      }

      // Route to appropriate handler
      let result: WebhookProcessingResult;

      if (isPaymentEvent(event.event)) {
        result = await this.handlePaymentEvent(event.event, event.payment as AsaasPaymentPayload);
      } else if (isSubscriptionEvent(event.event)) {
        result = await this.handleSubscriptionEvent(event.event, event.subscription as AsaasSubscriptionPayload);
      } else {
        // Unhandled event type - acknowledge but don't process
        result = {
          success: true,
          eventType: event.event,
          action: 'ignored',
        };
      }

      logger.end(operation, {
        eventType: event.event,
        success: result.success,
        action: result.action,
      });

      return result;
    } catch (error) {
      logger.error(operation, { eventType: event.event }, error instanceof Error ? error : new Error(String(error)));

      return {
        success: false,
        eventType: event.event,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Handle payment-related events.
   * @param eventType - Event type
   * @param payment - Payment payload
   * @returns Processing result
   */
  private async handlePaymentEvent(
    eventType: AsaasEventType,
    payment: AsaasPaymentPayload | undefined
  ): Promise<WebhookProcessingResult> {
    if (!payment) {
      throw new WebhookInvalidError('Payment payload is required for payment events', eventType);
    }

    // Find tenant by customer ID or subscription ID
    let tenant: TenantBillingData | null = null;
    if (payment.subscription) {
      tenant = await this.config.getTenantBySubscriptionId(payment.subscription);
    }
    if (!tenant) {
      tenant = await this.config.getTenantByCustomerId(payment.customer);
    }

    if (!tenant) {
      // Tenant not found - might be a customer not in our system
      return {
        success: true,
        eventType,
        action: 'tenant_not_found',
      };
    }

    switch (eventType) {
      case AsaasEventType.PAYMENT_CREATED:
        return this.handlePaymentCreated(tenant, payment);

      case AsaasEventType.PAYMENT_CONFIRMED:
      case AsaasEventType.PAYMENT_RECEIVED:
        return this.handlePaymentConfirmed(tenant, payment);

      case AsaasEventType.PAYMENT_OVERDUE:
        return this.handlePaymentOverdue(tenant, payment);

      case AsaasEventType.PAYMENT_REFUNDED:
        return this.handlePaymentRefunded(tenant, payment);

      default:
        return {
          success: true,
          eventType,
          tenantId: tenant.id,
          action: 'payment_event_ignored',
        };
    }
  }

  /**
   * Handle subscription-related events.
   * @param eventType - Event type
   * @param subscription - Subscription payload
   * @returns Processing result
   */
  private async handleSubscriptionEvent(
    eventType: AsaasEventType,
    subscription: AsaasSubscriptionPayload | undefined
  ): Promise<WebhookProcessingResult> {
    if (!subscription) {
      throw new WebhookInvalidError('Subscription payload is required for subscription events', eventType);
    }

    // Find tenant by subscription ID or customer ID
    let tenant = await this.config.getTenantBySubscriptionId(subscription.id);
    if (!tenant) {
      tenant = await this.config.getTenantByCustomerId(subscription.customer);
    }

    if (!tenant) {
      return {
        success: true,
        eventType,
        action: 'tenant_not_found',
      };
    }

    switch (eventType) {
      case AsaasEventType.SUBSCRIPTION_ACTIVATED:
        return this.handleSubscriptionActivated(tenant, subscription);

      case AsaasEventType.SUBSCRIPTION_CANCELED:
        return this.handleSubscriptionCanceled(tenant, subscription);

      case AsaasEventType.SUBSCRIPTION_UPDATED:
      case AsaasEventType.SUBSCRIPTION_RENEWED:
        return this.handleSubscriptionUpdated(tenant, subscription);

      default:
        return {
          success: true,
          eventType,
          tenantId: tenant.id,
          action: 'subscription_event_ignored',
        };
    }
  }

  // ============================================
  // Payment Event Handlers
  // ============================================

  /**
   * Handle PAYMENT_CREATED event.
   */
  private async handlePaymentCreated(
    tenant: TenantBillingData,
    payment: AsaasPaymentPayload
  ): Promise<WebhookProcessingResult> {
    logger.info('webhook.paymentCreated', `Payment created for tenant ${tenant.id}`, {
      tenantId: tenant.id,
      paymentId: payment.id,
      value: payment.value,
    });

    // Payment created - just log, no status change needed
    return {
      success: true,
      eventType: AsaasEventType.PAYMENT_CREATED,
      tenantId: tenant.id,
      action: 'payment_registered',
    };
  }

  /**
   * Handle PAYMENT_CONFIRMED/PAYMENT_RECEIVED event.
   */
  private async handlePaymentConfirmed(
    tenant: TenantBillingData,
    payment: AsaasPaymentPayload
  ): Promise<WebhookProcessingResult> {
    const paymentDate = payment.confirmedDate
      ? new Date(payment.confirmedDate)
      : new Date();

    await this.config.billingService.handlePaymentConfirmed(tenant.id, paymentDate);

    return {
      success: true,
      eventType: AsaasEventType.PAYMENT_CONFIRMED,
      tenantId: tenant.id,
      action: 'tenant_activated',
    };
  }

  /**
   * Handle PAYMENT_OVERDUE event.
   */
  private async handlePaymentOverdue(
    tenant: TenantBillingData,
    payment: AsaasPaymentPayload
  ): Promise<WebhookProcessingResult> {
    // Calculate days overdue
    const dueDate = new Date(payment.dueDate);
    const now = new Date();
    const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

    await this.config.billingService.handlePaymentOverdue(tenant.id, daysOverdue);

    return {
      success: true,
      eventType: AsaasEventType.PAYMENT_OVERDUE,
      tenantId: tenant.id,
      action: daysOverdue >= (this.config.daysUntilOverdueStatus ?? 1) ? 'tenant_overdue' : 'overdue_warning',
    };
  }

  /**
   * Handle PAYMENT_REFUNDED event.
   */
  private async handlePaymentRefunded(
    tenant: TenantBillingData,
    payment: AsaasPaymentPayload
  ): Promise<WebhookProcessingResult> {
    logger.info('webhook.paymentRefunded', `Payment refunded for tenant ${tenant.id}`, {
      tenantId: tenant.id,
      paymentId: payment.id,
      value: payment.value,
    });

    // For now, just log the refund. The actual handling depends on business rules.
    // A refund might not immediately change status.
    return {
      success: true,
      eventType: AsaasEventType.PAYMENT_REFUNDED,
      tenantId: tenant.id,
      action: 'refund_registered',
    };
  }

  // ============================================
  // Subscription Event Handlers
  // ============================================

  /**
   * Handle SUBSCRIPTION_ACTIVATED event.
   */
  private async handleSubscriptionActivated(
    tenant: TenantBillingData,
    _subscription: AsaasSubscriptionPayload
  ): Promise<WebhookProcessingResult> {
    // Sync subscription status
    await this.config.billingService.syncSubscriptionStatus(tenant.id);

    return {
      success: true,
      eventType: AsaasEventType.SUBSCRIPTION_ACTIVATED,
      tenantId: tenant.id,
      action: 'subscription_synced',
    };
  }

  /**
   * Handle SUBSCRIPTION_CANCELED event.
   */
  private async handleSubscriptionCanceled(
    tenant: TenantBillingData,
    _subscription: AsaasSubscriptionPayload
  ): Promise<WebhookProcessingResult> {
    // The subscription was canceled externally (e.g., from ASAAS dashboard)
    // We need to update our records
    try {
      await this.config.billingService.cancelSubscription(tenant.id);
    } catch {
      // If cancelSubscription fails (e.g., already canceled), just sync status
      await this.config.billingService.syncSubscriptionStatus(tenant.id);
    }

    return {
      success: true,
      eventType: AsaasEventType.SUBSCRIPTION_CANCELED,
      tenantId: tenant.id,
      action: 'tenant_canceled',
    };
  }

  /**
   * Handle SUBSCRIPTION_UPDATED/SUBSCRIPTION_RENEWED event.
   */
  private async handleSubscriptionUpdated(
    tenant: TenantBillingData,
    _subscription: AsaasSubscriptionPayload
  ): Promise<WebhookProcessingResult> {
    // Sync subscription status to get latest data
    await this.config.billingService.syncSubscriptionStatus(tenant.id);

    return {
      success: true,
      eventType: AsaasEventType.SUBSCRIPTION_UPDATED,
      tenantId: tenant.id,
      action: 'subscription_updated',
    };
  }
}

/**
 * Create a new WebhookHandler instance.
 * @param config - Handler configuration
 * @returns WebhookHandler instance
 */
export function createWebhookHandler(config: WebhookHandlerConfig): WebhookHandler {
  return new WebhookHandler(config);
}

/**
 * Webhook handler module export
 */
export const webhookHandler = {
  WebhookHandler,
  createWebhookHandler,
};
