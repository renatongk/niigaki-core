/**
 * Billing Errors
 * Custom error classes for billing operations.
 */

import { AppError, ErrorCode } from '../api/error-handler';
import { BillingStatus } from './types/billing-status';

/**
 * Extended error codes for billing.
 */
export enum BillingErrorCode {
  BILLING_ERROR = 'BILLING_ERROR',
  SUBSCRIPTION_CREATION_ERROR = 'SUBSCRIPTION_CREATION_ERROR',
  SUBSCRIPTION_CANCELLATION_ERROR = 'SUBSCRIPTION_CANCELLATION_ERROR',
  CUSTOMER_CREATION_ERROR = 'CUSTOMER_CREATION_ERROR',
  PAYMENT_OVERDUE_ERROR = 'PAYMENT_OVERDUE_ERROR',
  WEBHOOK_INVALID_ERROR = 'WEBHOOK_INVALID_ERROR',
  BILLING_STATUS_INVALID = 'BILLING_STATUS_INVALID',
  ASAAS_API_ERROR = 'ASAAS_API_ERROR',
  TENANT_NOT_BILLABLE = 'TENANT_NOT_BILLABLE',
  INVALID_BILLING_TRANSITION = 'INVALID_BILLING_TRANSITION',
}

/**
 * Base billing error class.
 */
export class BillingError extends AppError {
  public readonly billingErrorCode: BillingErrorCode;

  constructor(
    billingCode: BillingErrorCode,
    message: string,
    options?: {
      details?: Record<string, unknown>;
      correlationId?: string;
      cause?: Error;
    }
  ) {
    const errorOptions: {
      details?: Record<string, unknown>;
      correlationId?: string;
      cause?: Error;
    } = {};

    if (options?.details || billingCode) {
      errorOptions.details = { billingCode, ...options?.details };
    }
    if (options?.correlationId) {
      errorOptions.correlationId = options.correlationId;
    }
    if (options?.cause) {
      errorOptions.cause = options.cause;
    }

    super(ErrorCode.INTERNAL_ERROR, message, errorOptions);
    this.name = 'BillingError';
    this.billingErrorCode = billingCode;
  }
}

/**
 * Error thrown when subscription creation fails.
 */
export class SubscriptionCreationError extends BillingError {
  public readonly tenantId: string;
  public readonly customerId: string;

  constructor(
    tenantId: string,
    customerId: string,
    message: string = 'Failed to create subscription',
    options?: {
      details?: Record<string, unknown>;
      correlationId?: string;
      cause?: Error;
    }
  ) {
    const errorOptions: {
      details?: Record<string, unknown>;
      correlationId?: string;
      cause?: Error;
    } = {
      details: { tenantId, customerId, ...options?.details },
    };
    if (options?.correlationId) {
      errorOptions.correlationId = options.correlationId;
    }
    if (options?.cause) {
      errorOptions.cause = options.cause;
    }

    super(BillingErrorCode.SUBSCRIPTION_CREATION_ERROR, message, errorOptions);
    this.name = 'SubscriptionCreationError';
    this.tenantId = tenantId;
    this.customerId = customerId;
  }
}

/**
 * Error thrown when subscription cancellation fails.
 */
export class SubscriptionCancellationError extends BillingError {
  public readonly subscriptionId: string;

  constructor(
    subscriptionId: string,
    message: string = 'Failed to cancel subscription',
    options?: {
      details?: Record<string, unknown>;
      correlationId?: string;
      cause?: Error;
    }
  ) {
    const errorOptions: {
      details?: Record<string, unknown>;
      correlationId?: string;
      cause?: Error;
    } = {
      details: { subscriptionId, ...options?.details },
    };
    if (options?.correlationId) {
      errorOptions.correlationId = options.correlationId;
    }
    if (options?.cause) {
      errorOptions.cause = options.cause;
    }

    super(BillingErrorCode.SUBSCRIPTION_CANCELLATION_ERROR, message, errorOptions);
    this.name = 'SubscriptionCancellationError';
    this.subscriptionId = subscriptionId;
  }
}

/**
 * Error thrown when customer creation fails.
 */
export class CustomerCreationError extends BillingError {
  public readonly tenantId: string;

  constructor(
    tenantId: string,
    message: string = 'Failed to create customer in ASAAS',
    options?: {
      details?: Record<string, unknown>;
      correlationId?: string;
      cause?: Error;
    }
  ) {
    const errorOptions: {
      details?: Record<string, unknown>;
      correlationId?: string;
      cause?: Error;
    } = {
      details: { tenantId, ...options?.details },
    };
    if (options?.correlationId) {
      errorOptions.correlationId = options.correlationId;
    }
    if (options?.cause) {
      errorOptions.cause = options.cause;
    }

    super(BillingErrorCode.CUSTOMER_CREATION_ERROR, message, errorOptions);
    this.name = 'CustomerCreationError';
    this.tenantId = tenantId;
  }
}

/**
 * Error thrown when payment is overdue.
 */
export class PaymentOverdueError extends BillingError {
  public readonly tenantId: string;
  public readonly daysOverdue: number;

  constructor(
    tenantId: string,
    daysOverdue: number,
    message?: string,
    options?: {
      details?: Record<string, unknown>;
      correlationId?: string;
    }
  ) {
    const errorMessage = message ?? `Payment overdue by ${daysOverdue} days`;
    const errorOptions: {
      details?: Record<string, unknown>;
      correlationId?: string;
    } = {
      details: { tenantId, daysOverdue, ...options?.details },
    };
    if (options?.correlationId) {
      errorOptions.correlationId = options.correlationId;
    }

    super(BillingErrorCode.PAYMENT_OVERDUE_ERROR, errorMessage, errorOptions);
    this.name = 'PaymentOverdueError';
    this.tenantId = tenantId;
    this.daysOverdue = daysOverdue;
  }
}

/**
 * Error thrown when webhook validation fails.
 */
export class WebhookInvalidError extends BillingError {
  public readonly eventType?: string | undefined;

  constructor(
    message: string = 'Invalid webhook payload',
    eventType?: string,
    options?: {
      details?: Record<string, unknown>;
      correlationId?: string;
    }
  ) {
    const details: Record<string, unknown> = { ...options?.details };
    if (eventType) {
      details['eventType'] = eventType;
    }
    const errorOptions: {
      details?: Record<string, unknown>;
      correlationId?: string;
    } = {
      details,
    };
    if (options?.correlationId) {
      errorOptions.correlationId = options.correlationId;
    }

    super(BillingErrorCode.WEBHOOK_INVALID_ERROR, message, errorOptions);
    this.name = 'WebhookInvalidError';
    this.eventType = eventType;
  }
}

/**
 * Error thrown when tenant billing status is invalid for operation.
 */
export class BillingStatusInvalidError extends BillingError {
  public readonly currentStatus: BillingStatus;
  public readonly requiredStatus?: BillingStatus[] | undefined;

  constructor(
    currentStatus: BillingStatus,
    message: string,
    requiredStatus?: BillingStatus[],
    options?: {
      details?: Record<string, unknown>;
      correlationId?: string;
    }
  ) {
    const details: Record<string, unknown> = { currentStatus, ...options?.details };
    if (requiredStatus) {
      details['requiredStatus'] = requiredStatus;
    }
    const errorOptions: {
      details?: Record<string, unknown>;
      correlationId?: string;
    } = {
      details,
    };
    if (options?.correlationId) {
      errorOptions.correlationId = options.correlationId;
    }

    super(BillingErrorCode.BILLING_STATUS_INVALID, message, errorOptions);
    this.name = 'BillingStatusInvalidError';
    this.currentStatus = currentStatus;
    this.requiredStatus = requiredStatus;
  }
}

/**
 * Error thrown when ASAAS API returns an error.
 */
export class AsaasApiError extends BillingError {
  public readonly httpStatusCode: number;
  public readonly apiErrors?: Array<{ code: string; description: string }> | undefined;

  constructor(
    statusCode: number,
    message: string,
    apiErrors?: Array<{ code: string; description: string }>,
    options?: {
      details?: Record<string, unknown>;
      correlationId?: string;
      cause?: Error;
    }
  ) {
    const details: Record<string, unknown> = { statusCode, ...options?.details };
    if (apiErrors) {
      details['apiErrors'] = apiErrors;
    }
    const errorOptions: {
      details?: Record<string, unknown>;
      correlationId?: string;
      cause?: Error;
    } = {
      details,
    };
    if (options?.correlationId) {
      errorOptions.correlationId = options.correlationId;
    }
    if (options?.cause) {
      errorOptions.cause = options.cause;
    }

    super(BillingErrorCode.ASAAS_API_ERROR, message, errorOptions);
    this.name = 'AsaasApiError';
    this.httpStatusCode = statusCode;
    this.apiErrors = apiErrors;
  }
}

/**
 * Error thrown when an invalid billing status transition is attempted.
 */
export class InvalidBillingTransitionError extends BillingError {
  public readonly fromStatus: BillingStatus;
  public readonly toStatus: BillingStatus;

  constructor(
    fromStatus: BillingStatus,
    toStatus: BillingStatus,
    options?: {
      details?: Record<string, unknown>;
      correlationId?: string;
    }
  ) {
    const message = `Invalid billing status transition from '${fromStatus}' to '${toStatus}'`;
    const errorOptions: {
      details?: Record<string, unknown>;
      correlationId?: string;
    } = {
      details: { fromStatus, toStatus, ...options?.details },
    };
    if (options?.correlationId) {
      errorOptions.correlationId = options.correlationId;
    }

    super(BillingErrorCode.INVALID_BILLING_TRANSITION, message, errorOptions);
    this.name = 'InvalidBillingTransitionError';
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
  }
}

/**
 * Type guard to check if an error is a BillingError.
 * @param error - The error to check
 * @returns true if the error is a BillingError
 */
export function isBillingError(error: unknown): error is BillingError {
  return error instanceof BillingError;
}

/**
 * Billing errors module export
 */
export const billingErrors = {
  BillingErrorCode,
  BillingError,
  SubscriptionCreationError,
  SubscriptionCancellationError,
  CustomerCreationError,
  PaymentOverdueError,
  WebhookInvalidError,
  BillingStatusInvalidError,
  AsaasApiError,
  InvalidBillingTransitionError,
  isBillingError,
};
