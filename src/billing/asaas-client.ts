/**
 * ASAAS Client
 * HTTP client wrapper for ASAAS API operations.
 */

import { HttpClient, createHttpClient } from '../api/http-client';
import { logger } from '../logging/logger';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  AsaasCustomerResponse,
} from './dtos/customer.dto';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  AsaasSubscriptionResponse,
} from './dtos/subscription.dto';
import {
  ListInvoicesDto,
  AsaasInvoiceResponse,
  AsaasPaginatedResponse,
} from './dtos/invoice.dto';
import { AsaasApiError } from './billing-errors';

/**
 * ASAAS environment configuration.
 */
export type AsaasEnvironment = 'sandbox' | 'production';

/**
 * ASAAS API base URLs.
 */
export const ASAAS_BASE_URLS: Record<AsaasEnvironment, string> = {
  sandbox: 'https://sandbox.asaas.com/api/v3',
  production: 'https://api.asaas.com/v3',
};

/**
 * ASAAS client configuration.
 */
export interface AsaasClientConfig {
  /** ASAAS API key */
  apiKey: string;
  /** Environment (sandbox or production) */
  environment: AsaasEnvironment;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * ASAAS API error response structure.
 */
interface AsaasErrorResponse {
  errors?: Array<{
    code: string;
    description: string;
  }>;
}

/**
 * ASAAS API Client class.
 * Provides methods for interacting with the ASAAS billing API.
 */
export class AsaasClient {
  private readonly httpClient: HttpClient;
  private readonly config: AsaasClientConfig;

  constructor(config: AsaasClientConfig) {
    this.config = config;
    this.httpClient = createHttpClient({
      baseUrl: ASAAS_BASE_URLS[config.environment],
      timeout: config.timeout ?? 30000,
      defaultHeaders: {
        'Content-Type': 'application/json',
        'access_token': config.apiKey,
      },
    });
  }

  /**
   * Handle ASAAS API errors.
   * @param error - Error from HTTP client
   * @param operation - Operation name for logging
   */
  private handleError(error: unknown, operation: string): never {
    logger.error(`asaas.${operation}`, null, error instanceof Error ? error : new Error(String(error)));

    if (error instanceof Error && 'statusCode' in error && 'details' in error) {
      const appError = error as { statusCode: number; details?: Record<string, unknown> };
      const data = appError.details?.['data'] as AsaasErrorResponse | undefined;
      throw new AsaasApiError(
        appError.statusCode,
        `ASAAS API error during ${operation}`,
        data?.errors,
        { cause: error as Error }
      );
    }

    const errorOptions: { cause?: Error } = {};
    if (error instanceof Error) {
      errorOptions.cause = error;
    }

    throw new AsaasApiError(
      500,
      `Unexpected error during ${operation}: ${error instanceof Error ? error.message : String(error)}`,
      undefined,
      errorOptions
    );
  }

  // ============================================
  // Customer Operations
  // ============================================

  /**
   * Create a new customer in ASAAS.
   * @param data - Customer creation data
   * @returns Created customer
   */
  async createCustomer(data: CreateCustomerDto): Promise<AsaasCustomerResponse> {
    const operation = 'createCustomer';
    logger.start(`asaas.${operation}`, { email: data.email });

    try {
      const response = await this.httpClient.post<AsaasCustomerResponse>('/customers', data);
      logger.end(`asaas.${operation}`, { customerId: response.data.id });
      return response.data;
    } catch (error) {
      this.handleError(error, operation);
    }
  }

  /**
   * Get a customer by ID.
   * @param customerId - ASAAS customer ID
   * @returns Customer data
   */
  async getCustomer(customerId: string): Promise<AsaasCustomerResponse> {
    const operation = 'getCustomer';
    logger.start(`asaas.${operation}`, { customerId });

    try {
      const response = await this.httpClient.get<AsaasCustomerResponse>(`/customers/${customerId}`);
      logger.end(`asaas.${operation}`, { customerId });
      return response.data;
    } catch (error) {
      this.handleError(error, operation);
    }
  }

  /**
   * Update a customer.
   * @param customerId - ASAAS customer ID
   * @param data - Customer update data
   * @returns Updated customer
   */
  async updateCustomer(customerId: string, data: UpdateCustomerDto): Promise<AsaasCustomerResponse> {
    const operation = 'updateCustomer';
    logger.start(`asaas.${operation}`, { customerId });

    try {
      const response = await this.httpClient.put<AsaasCustomerResponse>(`/customers/${customerId}`, data);
      logger.end(`asaas.${operation}`, { customerId });
      return response.data;
    } catch (error) {
      this.handleError(error, operation);
    }
  }

  /**
   * Find customers by external reference.
   * @param externalReference - External reference (e.g., tenant ID)
   * @returns List of matching customers
   */
  async findCustomerByExternalReference(externalReference: string): Promise<AsaasPaginatedResponse<AsaasCustomerResponse>> {
    const operation = 'findCustomerByExternalReference';
    logger.start(`asaas.${operation}`, { externalReference });

    try {
      const response = await this.httpClient.get<AsaasPaginatedResponse<AsaasCustomerResponse>>('/customers', {
        params: { externalReference },
      });
      logger.end(`asaas.${operation}`, { count: response.data.totalCount });
      return response.data;
    } catch (error) {
      this.handleError(error, operation);
    }
  }

  // ============================================
  // Subscription Operations
  // ============================================

  /**
   * Create a new subscription.
   * @param data - Subscription creation data
   * @returns Created subscription
   */
  async createSubscription(data: CreateSubscriptionDto): Promise<AsaasSubscriptionResponse> {
    const operation = 'createSubscription';
    logger.start(`asaas.${operation}`, { customerId: data.customer, value: data.value });

    try {
      const response = await this.httpClient.post<AsaasSubscriptionResponse>('/subscriptions', data);
      logger.end(`asaas.${operation}`, { subscriptionId: response.data.id });
      return response.data;
    } catch (error) {
      this.handleError(error, operation);
    }
  }

  /**
   * Get a subscription by ID.
   * @param subscriptionId - ASAAS subscription ID
   * @returns Subscription data
   */
  async getSubscription(subscriptionId: string): Promise<AsaasSubscriptionResponse> {
    const operation = 'getSubscription';
    logger.start(`asaas.${operation}`, { subscriptionId });

    try {
      const response = await this.httpClient.get<AsaasSubscriptionResponse>(`/subscriptions/${subscriptionId}`);
      logger.end(`asaas.${operation}`, { subscriptionId });
      return response.data;
    } catch (error) {
      this.handleError(error, operation);
    }
  }

  /**
   * Update a subscription.
   * @param subscriptionId - ASAAS subscription ID
   * @param data - Subscription update data
   * @returns Updated subscription
   */
  async updateSubscription(subscriptionId: string, data: UpdateSubscriptionDto): Promise<AsaasSubscriptionResponse> {
    const operation = 'updateSubscription';
    logger.start(`asaas.${operation}`, { subscriptionId });

    try {
      const response = await this.httpClient.put<AsaasSubscriptionResponse>(`/subscriptions/${subscriptionId}`, data);
      logger.end(`asaas.${operation}`, { subscriptionId });
      return response.data;
    } catch (error) {
      this.handleError(error, operation);
    }
  }

  /**
   * Cancel (delete) a subscription.
   * @param subscriptionId - ASAAS subscription ID
   * @returns Deletion confirmation
   */
  async cancelSubscription(subscriptionId: string): Promise<{ deleted: boolean; id: string }> {
    const operation = 'cancelSubscription';
    logger.start(`asaas.${operation}`, { subscriptionId });

    try {
      const response = await this.httpClient.delete<{ deleted: boolean; id: string }>(`/subscriptions/${subscriptionId}`);
      logger.end(`asaas.${operation}`, { subscriptionId, deleted: response.data.deleted });
      return response.data;
    } catch (error) {
      this.handleError(error, operation);
    }
  }

  /**
   * Find subscriptions by customer ID.
   * @param customerId - ASAAS customer ID
   * @returns List of subscriptions
   */
  async findSubscriptionsByCustomer(customerId: string): Promise<AsaasPaginatedResponse<AsaasSubscriptionResponse>> {
    const operation = 'findSubscriptionsByCustomer';
    logger.start(`asaas.${operation}`, { customerId });

    try {
      const response = await this.httpClient.get<AsaasPaginatedResponse<AsaasSubscriptionResponse>>('/subscriptions', {
        params: { customer: customerId },
      });
      logger.end(`asaas.${operation}`, { count: response.data.totalCount });
      return response.data;
    } catch (error) {
      this.handleError(error, operation);
    }
  }

  // ============================================
  // Invoice/Payment Operations
  // ============================================

  /**
   * List invoices/payments for a subscription.
   * @param subscriptionId - ASAAS subscription ID
   * @param params - Optional query parameters
   * @returns List of invoices/payments
   */
  async listInvoices(subscriptionId: string, params?: Partial<ListInvoicesDto>): Promise<AsaasPaginatedResponse<AsaasInvoiceResponse>> {
    const operation = 'listInvoices';
    logger.start(`asaas.${operation}`, { subscriptionId });

    try {
      const response = await this.httpClient.get<AsaasPaginatedResponse<AsaasInvoiceResponse>>(
        `/subscriptions/${subscriptionId}/payments`,
        { params: params as Record<string, string | number | boolean> }
      );
      logger.end(`asaas.${operation}`, { subscriptionId, count: response.data.totalCount });
      return response.data;
    } catch (error) {
      this.handleError(error, operation);
    }
  }

  /**
   * Get a specific payment/invoice by ID.
   * @param paymentId - ASAAS payment ID
   * @returns Payment/invoice data
   */
  async getPayment(paymentId: string): Promise<AsaasInvoiceResponse> {
    const operation = 'getPayment';
    logger.start(`asaas.${operation}`, { paymentId });

    try {
      const response = await this.httpClient.get<AsaasInvoiceResponse>(`/payments/${paymentId}`);
      logger.end(`asaas.${operation}`, { paymentId });
      return response.data;
    } catch (error) {
      this.handleError(error, operation);
    }
  }

  /**
   * List all payments with optional filters.
   * @param params - Query parameters
   * @returns List of payments
   */
  async listPayments(params?: ListInvoicesDto): Promise<AsaasPaginatedResponse<AsaasInvoiceResponse>> {
    const operation = 'listPayments';
    logger.start(`asaas.${operation}`, { params });

    try {
      const response = await this.httpClient.get<AsaasPaginatedResponse<AsaasInvoiceResponse>>(
        '/payments',
        { params: params as Record<string, string | number | boolean> }
      );
      logger.end(`asaas.${operation}`, { count: response.data.totalCount });
      return response.data;
    } catch (error) {
      this.handleError(error, operation);
    }
  }

  /**
   * Get the ASAAS environment being used.
   * @returns Environment name
   */
  getEnvironment(): AsaasEnvironment {
    return this.config.environment;
  }
}

/**
 * Create a new ASAAS client instance.
 * @param config - Client configuration
 * @returns ASAAS client instance
 */
export function createAsaasClient(config: AsaasClientConfig): AsaasClient {
  return new AsaasClient(config);
}

/**
 * ASAAS client module export
 */
export const asaasClient = {
  AsaasClient,
  createAsaasClient,
  ASAAS_BASE_URLS,
};
