/**
 * Subscription DTOs
 * Data Transfer Objects for ASAAS subscription operations.
 */

import { BillingCycle } from '../types/billing-plan';

/**
 * Billing type options for subscriptions.
 */
export type AsaasBillingType =
  | 'BOLETO'
  | 'CREDIT_CARD'
  | 'PIX'
  | 'UNDEFINED';

/**
 * Discount type options.
 */
export type AsaasDiscountType =
  | 'FIXED'
  | 'PERCENTAGE';

/**
 * Fine/Interest type options.
 */
export type AsaasFineType =
  | 'FIXED'
  | 'PERCENTAGE';

/**
 * Input for creating a new ASAAS subscription.
 */
export interface CreateSubscriptionDto {
  /** ASAAS customer ID */
  customer: string;
  /** Billing type */
  billingType: AsaasBillingType;
  /** Subscription value in currency unit (e.g., 99.90) */
  value: number;
  /** Due date for first payment (YYYY-MM-DD) */
  nextDueDate: string;
  /** Subscription cycle */
  cycle: BillingCycle;
  /** Subscription description */
  description?: string;
  /** External reference (e.g., tenant ID) */
  externalReference?: string;
  /** End date for the subscription (YYYY-MM-DD) */
  endDate?: string;
  /** Maximum number of payments */
  maxPayments?: number;
  /** Discount configuration */
  discount?: {
    value: number;
    type: AsaasDiscountType;
    dueDateLimitDays?: number;
  };
  /** Fine configuration for late payments */
  fine?: {
    value: number;
    type: AsaasFineType;
  };
  /** Interest configuration for late payments */
  interest?: {
    value: number;
  };
  /** Credit card information (for CREDIT_CARD billing type) */
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  /** Credit card holder info (for CREDIT_CARD billing type) */
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    addressComplement?: string;
    phone: string;
    mobilePhone?: string;
  };
  /** Remote IP address for credit card payments */
  remoteIp?: string;
}

/**
 * Input for updating an existing ASAAS subscription.
 */
export interface UpdateSubscriptionDto {
  /** Billing type */
  billingType?: AsaasBillingType;
  /** Subscription value */
  value?: number;
  /** Subscription cycle */
  cycle?: BillingCycle;
  /** Next due date (YYYY-MM-DD) */
  nextDueDate?: string;
  /** Subscription description */
  description?: string;
  /** External reference */
  externalReference?: string;
  /** Discount configuration */
  discount?: {
    value: number;
    type: AsaasDiscountType;
    dueDateLimitDays?: number;
  };
  /** Fine configuration */
  fine?: {
    value: number;
    type: AsaasFineType;
  };
  /** Interest configuration */
  interest?: {
    value: number;
  };
  /** Update pending payments */
  updatePendingPayments?: boolean;
}

/**
 * ASAAS subscription response structure.
 */
export interface AsaasSubscriptionResponse {
  id: string;
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  nextDueDate: string;
  cycle: string;
  description?: string;
  externalReference?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  dateCreated: string;
  deleted: boolean;
  endDate?: string;
  maxPayments?: number;
  discount?: {
    value: number;
    type: AsaasDiscountType;
    dueDateLimitDays?: number;
  };
  fine?: {
    value: number;
    type: AsaasFineType;
  };
  interest?: {
    value: number;
  };
}

/**
 * Validate CreateSubscriptionDto fields.
 * @param dto - The DTO to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateCreateSubscriptionDto(dto: CreateSubscriptionDto): string[] {
  const errors: string[] = [];

  if (!dto.customer || dto.customer.trim().length === 0) {
    errors.push('customer is required');
  }

  if (!dto.billingType) {
    errors.push('billingType is required');
  }

  if (typeof dto.value !== 'number' || dto.value <= 0) {
    errors.push('value must be a positive number');
  }

  if (!dto.nextDueDate || dto.nextDueDate.trim().length === 0) {
    errors.push('nextDueDate is required');
  } else if (!isValidDate(dto.nextDueDate)) {
    errors.push('nextDueDate must be in YYYY-MM-DD format');
  }

  if (!dto.cycle) {
    errors.push('cycle is required');
  }

  return errors;
}

/**
 * Simple date format validation (YYYY-MM-DD).
 */
function isValidDate(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Subscription DTO module export
 */
export const subscriptionDto = {
  validateCreateSubscriptionDto,
};
