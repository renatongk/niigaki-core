/**
 * Billing Service
 * Main service for managing tenant billing lifecycle.
 */

import { logger } from '../logging/logger';
import { AsaasClient } from './asaas-client';
import {
  SubscriptionService,
  TenantBillingData,
  UpdateTenantBillingCallback,
  GetTenantBillingCallback,
  InitializeSubscriptionOptions,
  InitializeSubscriptionResult,
} from './subscription-service';
import { BillingStatus } from './types/billing-status';
import { BillingPlan } from './types/billing-plan';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  AsaasCustomerResponse,
} from './dtos/customer.dto';
import { Invoice, toInvoice } from './dtos/invoice.dto';
import { CustomerCreationError } from './billing-errors';
import { AsaasBillingType } from './dtos/subscription.dto';

/**
 * Tenant data required for billing operations.
 */
export interface BillableTenant {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string | undefined;
  address?: string | undefined;
  addressNumber?: string | undefined;
  postalCode?: string | undefined;
  city?: string | undefined;
  province?: string | undefined;
  asaasCustomerId?: string | undefined;
  asaasSubscriptionId?: string | undefined;
  billingStatus: BillingStatus;
}

/**
 * Billing service configuration.
 */
export interface BillingServiceConfig {
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
  /** Currency code */
  currency?: string | undefined;
}

/**
 * Result of customer creation.
 */
export interface CreateCustomerResult {
  customerId: string;
  customer: AsaasCustomerResponse;
}

/**
 * Billing Service class.
 * Main entry point for billing operations.
 */
export class BillingService {
  private readonly asaasClient: AsaasClient;
  private readonly subscriptionService: SubscriptionService;
  private readonly config: BillingServiceConfig;

  constructor(config: BillingServiceConfig) {
    this.config = {
      ...config,
      currency: config.currency ?? 'BRL',
    };
    this.asaasClient = config.asaasClient;
    this.subscriptionService = new SubscriptionService({
      asaasClient: config.asaasClient,
      updateTenantBilling: config.updateTenantBilling,
      getTenantBilling: config.getTenantBilling,
      defaultBillingType: config.defaultBillingType ?? 'BOLETO',
      daysUntilSuspension: config.daysUntilSuspension ?? 15,
    });
  }

  // ============================================
  // Customer Operations
  // ============================================

  /**
   * Create an ASAAS customer for a tenant.
   * @param tenant - Billable tenant data
   * @returns Created customer result
   */
  async createCustomerForTenant(tenant: BillableTenant): Promise<CreateCustomerResult> {
    const operation = 'billing.createCustomer';
    logger.start(operation, { tenantId: tenant.id, email: tenant.email });

    try {
      // Check if customer already exists
      if (tenant.asaasCustomerId) {
        const existingCustomer = await this.asaasClient.getCustomer(tenant.asaasCustomerId);
        logger.end(operation, { tenantId: tenant.id, customerId: existingCustomer.id, existing: true });
        return {
          customerId: existingCustomer.id,
          customer: existingCustomer,
        };
      }

      // Check if customer exists by external reference
      const existingByRef = await this.asaasClient.findCustomerByExternalReference(tenant.id);
      if (existingByRef.totalCount > 0 && existingByRef.data[0]) {
        const customer = existingByRef.data[0];
        // Update tenant with customer ID
        await this.config.updateTenantBilling(tenant.id, {
          asaasCustomerId: customer.id,
        });
        logger.end(operation, { tenantId: tenant.id, customerId: customer.id, existing: true });
        return {
          customerId: customer.id,
          customer,
        };
      }

      // Create new customer
      const customerData: CreateCustomerDto = {
        name: tenant.name,
        email: tenant.email,
        cpfCnpj: tenant.cpfCnpj,
        externalReference: tenant.id,
      };

      if (tenant.phone) {
        customerData.phone = tenant.phone;
      }
      if (tenant.address) {
        customerData.address = tenant.address;
      }
      if (tenant.addressNumber) {
        customerData.addressNumber = tenant.addressNumber;
      }
      if (tenant.postalCode) {
        customerData.postalCode = tenant.postalCode;
      }
      if (tenant.city) {
        customerData.city = tenant.city;
      }
      if (tenant.province) {
        customerData.province = tenant.province;
      }

      const customer = await this.asaasClient.createCustomer(customerData);

      // Update tenant with customer ID
      await this.config.updateTenantBilling(tenant.id, {
        asaasCustomerId: customer.id,
      });

      logger.end(operation, { tenantId: tenant.id, customerId: customer.id });
      return {
        customerId: customer.id,
        customer,
      };
    } catch (error) {
      logger.error(operation, { tenantId: tenant.id }, error instanceof Error ? error : new Error(String(error)));

      if (error instanceof CustomerCreationError) {
        throw error;
      }

      const errorOptions: { cause?: Error } = {};
      if (error instanceof Error) {
        errorOptions.cause = error;
      }

      throw new CustomerCreationError(
        tenant.id,
        `Failed to create customer: ${error instanceof Error ? error.message : String(error)}`,
        errorOptions
      );
    }
  }

  /**
   * Update an ASAAS customer.
   * @param tenantId - Tenant ID
   * @param customerId - ASAAS customer ID
   * @param data - Update data
   * @returns Updated customer
   */
  async updateCustomer(tenantId: string, customerId: string, data: UpdateCustomerDto): Promise<AsaasCustomerResponse> {
    const operation = 'billing.updateCustomer';
    logger.start(operation, { tenantId, customerId });

    try {
      const customer = await this.asaasClient.updateCustomer(customerId, data);
      logger.end(operation, { tenantId, customerId });
      return customer;
    } catch (error) {
      logger.error(operation, { tenantId, customerId }, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get customer information.
   * @param customerId - ASAAS customer ID
   * @returns Customer data
   */
  async getCustomer(customerId: string): Promise<AsaasCustomerResponse> {
    return this.asaasClient.getCustomer(customerId);
  }

  // ============================================
  // Subscription Operations
  // ============================================

  /**
   * Initialize subscription for a tenant.
   * This creates a customer if needed and sets up the subscription.
   * @param tenant - Billable tenant data
   * @param plan - Billing plan
   * @param options - Additional options
   * @returns Subscription result
   */
  async initializeSubscription(
    tenant: BillableTenant,
    plan: BillingPlan,
    options?: { billingType?: AsaasBillingType; startWithTrial?: boolean }
  ): Promise<InitializeSubscriptionResult> {
    const operation = 'billing.initializeSubscription';
    logger.start(operation, { tenantId: tenant.id, planId: plan.id });

    try {
      // Ensure customer exists
      let customerId = tenant.asaasCustomerId;
      if (!customerId) {
        const result = await this.createCustomerForTenant(tenant);
        customerId = result.customerId;
      }

      // Initialize subscription
      const subscriptionOptions: InitializeSubscriptionOptions = {
        tenantId: tenant.id,
        customerId,
        plan,
        startWithTrial: options?.startWithTrial ?? plan.trialDays > 0,
      };

      if (options?.billingType) {
        subscriptionOptions.billingType = options.billingType;
      }

      const result = await this.subscriptionService.initializeSubscriptionForTenant(subscriptionOptions);

      logger.end(operation, { tenantId: tenant.id, subscriptionId: result.subscriptionId });
      return result;
    } catch (error) {
      logger.error(operation, { tenantId: tenant.id }, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Cancel a tenant's subscription.
   * @param tenantId - Tenant ID
   */
  async cancelSubscription(tenantId: string): Promise<void> {
    return this.subscriptionService.cancelSubscription(tenantId);
  }

  /**
   * Sync subscription status from ASAAS.
   * @param tenantId - Tenant ID
   * @returns Updated billing data
   */
  async syncSubscriptionStatus(tenantId: string): Promise<TenantBillingData> {
    return this.subscriptionService.syncSubscriptionStatus(tenantId);
  }

  // ============================================
  // Invoice Operations
  // ============================================

  /**
   * List invoices for a tenant's subscription.
   * @param tenantId - Tenant ID
   * @param subscriptionId - ASAAS subscription ID
   * @returns List of invoices
   */
  async listInvoices(tenantId: string, subscriptionId: string): Promise<Invoice[]> {
    const operation = 'billing.listInvoices';
    logger.start(operation, { tenantId, subscriptionId });

    try {
      const response = await this.asaasClient.listInvoices(subscriptionId);
      const invoices = response.data.map((invoice) => toInvoice(invoice, tenantId, this.config.currency));

      logger.end(operation, { tenantId, count: invoices.length });
      return invoices;
    } catch (error) {
      logger.error(operation, { tenantId, subscriptionId }, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get a specific invoice.
   * @param tenantId - Tenant ID
   * @param paymentId - ASAAS payment ID
   * @returns Invoice data
   */
  async getInvoice(tenantId: string, paymentId: string): Promise<Invoice> {
    const operation = 'billing.getInvoice';
    logger.start(operation, { tenantId, paymentId });

    try {
      const payment = await this.asaasClient.getPayment(paymentId);
      const invoice = toInvoice(payment, tenantId, this.config.currency);

      logger.end(operation, { tenantId, paymentId });
      return invoice;
    } catch (error) {
      logger.error(operation, { tenantId, paymentId }, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // ============================================
  // Status Management
  // ============================================

  /**
   * Handle payment confirmed event.
   * @param tenantId - Tenant ID
   * @param paymentDate - Date of payment
   */
  async handlePaymentConfirmed(tenantId: string, paymentDate: Date): Promise<void> {
    return this.subscriptionService.handlePaymentConfirmed(tenantId, paymentDate);
  }

  /**
   * Handle payment overdue event.
   * @param tenantId - Tenant ID
   * @param daysOverdue - Number of days overdue
   */
  async handlePaymentOverdue(tenantId: string, daysOverdue: number): Promise<void> {
    return this.subscriptionService.handlePaymentOverdue(tenantId, daysOverdue);
  }

  /**
   * Get tenant billing data.
   * @param tenantId - Tenant ID
   * @returns Billing data or null
   */
  async getTenantBillingData(tenantId: string): Promise<TenantBillingData | null> {
    return this.config.getTenantBilling(tenantId);
  }

  /**
   * Check if a tenant is in good billing standing.
   * @param tenantId - Tenant ID
   * @returns true if tenant can access the system
   */
  async isTenantInGoodStanding(tenantId: string): Promise<boolean> {
    const billing = await this.config.getTenantBilling(tenantId);
    if (!billing) {
      return false;
    }

    const goodStandingStatuses: BillingStatus[] = [
      BillingStatus.ACTIVE,
      BillingStatus.TRIAL,
    ];

    return goodStandingStatuses.includes(billing.billingStatus);
  }

  /**
   * Check if a tenant has limited access (e.g., overdue but not suspended).
   * @param tenantId - Tenant ID
   * @returns true if tenant has limited access
   */
  async hasTenantLimitedAccess(tenantId: string): Promise<boolean> {
    const billing = await this.config.getTenantBilling(tenantId);
    if (!billing) {
      return false;
    }

    const limitedAccessStatuses: BillingStatus[] = [
      BillingStatus.OVERDUE,
      BillingStatus.PENDING_PAYMENT,
    ];

    return limitedAccessStatuses.includes(billing.billingStatus);
  }

  /**
   * Get the subscription service instance.
   * @returns SubscriptionService instance
   */
  getSubscriptionService(): SubscriptionService {
    return this.subscriptionService;
  }

  /**
   * Get the ASAAS client instance.
   * @returns AsaasClient instance
   */
  getAsaasClient(): AsaasClient {
    return this.asaasClient;
  }
}

/**
 * Create a new BillingService instance.
 * @param config - Service configuration
 * @returns BillingService instance
 */
export function createBillingService(config: BillingServiceConfig): BillingService {
  return new BillingService(config);
}

/**
 * Billing service module export
 */
export const billingService = {
  BillingService,
  createBillingService,
};
