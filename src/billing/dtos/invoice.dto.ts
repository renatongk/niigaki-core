/**
 * Invoice DTOs
 * Data Transfer Objects for ASAAS invoice/payment operations.
 */

import { AsaasPaymentStatus } from '../types/asaas-events';

/**
 * Invoice/Payment query parameters.
 */
export interface ListInvoicesDto {
  /** Subscription ID to filter by */
  subscription?: string;
  /** Customer ID to filter by */
  customer?: string;
  /** Status to filter by */
  status?: AsaasPaymentStatus;
  /** Start due date filter (YYYY-MM-DD) */
  dueDateStart?: string;
  /** End due date filter (YYYY-MM-DD) */
  dueDateEnd?: string;
  /** Start payment date filter (YYYY-MM-DD) */
  paymentDateStart?: string;
  /** End payment date filter (YYYY-MM-DD) */
  paymentDateEnd?: string;
  /** External reference filter */
  externalReference?: string;
  /** Result offset for pagination */
  offset?: number;
  /** Result limit for pagination */
  limit?: number;
}

/**
 * ASAAS payment/invoice response structure.
 */
export interface AsaasInvoiceResponse {
  id: string;
  customer: string;
  subscription?: string;
  installment?: string;
  billingType: string;
  value: number;
  netValue: number;
  status: AsaasPaymentStatus;
  dueDate: string;
  originalDueDate?: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  description?: string;
  externalReference?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  invoiceNumber?: string;
  dateCreated: string;
  confirmedDate?: string;
  creditDate?: string;
  estimatedCreditDate?: string;
  deleted: boolean;
  anticipated: boolean;
  anticipable: boolean;
  transactionReceiptUrl?: string;
  discount?: {
    value: number;
    type: string;
    dueDateLimitDays?: number;
  };
  fine?: {
    value: number;
    type: string;
  };
  interest?: {
    value: number;
  };
  postalService?: boolean;
}

/**
 * Paginated response from ASAAS API.
 */
export interface AsaasPaginatedResponse<T> {
  object: 'list';
  hasMore: boolean;
  totalCount: number;
  limit: number;
  offset: number;
  data: T[];
}

/**
 * Internal invoice representation for the billing system.
 */
export interface Invoice {
  /** ASAAS invoice/payment ID */
  id: string;
  /** Tenant ID this invoice belongs to */
  tenantId: string;
  /** ASAAS customer ID */
  customerId: string;
  /** ASAAS subscription ID */
  subscriptionId?: string | undefined;
  /** Invoice amount in cents */
  amountInCents: number;
  /** Net amount in cents (after fees) */
  netAmountInCents: number;
  /** Currency code */
  currency: string;
  /** Payment status */
  status: AsaasPaymentStatus;
  /** Due date */
  dueDate: Date;
  /** Payment date (if paid) */
  paymentDate?: Date | undefined;
  /** Invoice URL */
  invoiceUrl?: string | undefined;
  /** Bank slip URL (if applicable) */
  bankSlipUrl?: string | undefined;
  /** External reference */
  externalReference?: string | undefined;
  /** Invoice description */
  description?: string | undefined;
  /** Date the invoice was created */
  createdAt: Date;
  /** Date the payment was confirmed */
  confirmedAt?: Date | undefined;
  /** Date funds will be credited */
  creditDate?: Date | undefined;
}

/**
 * Convert ASAAS invoice response to internal Invoice format.
 * @param response - ASAAS invoice response
 * @param tenantId - Tenant ID
 * @param currency - Currency code (default: BRL)
 * @returns Internal Invoice object
 */
export function toInvoice(
  response: AsaasInvoiceResponse,
  tenantId: string,
  currency: string = 'BRL'
): Invoice {
  const invoice: Invoice = {
    id: response.id,
    tenantId,
    customerId: response.customer,
    amountInCents: Math.round(response.value * 100),
    netAmountInCents: Math.round(response.netValue * 100),
    currency,
    status: response.status,
    dueDate: new Date(response.dueDate),
    createdAt: new Date(response.dateCreated),
  };

  if (response.subscription) {
    invoice.subscriptionId = response.subscription;
  }
  if (response.paymentDate) {
    invoice.paymentDate = new Date(response.paymentDate);
  }
  if (response.invoiceUrl) {
    invoice.invoiceUrl = response.invoiceUrl;
  }
  if (response.bankSlipUrl) {
    invoice.bankSlipUrl = response.bankSlipUrl;
  }
  if (response.externalReference) {
    invoice.externalReference = response.externalReference;
  }
  if (response.description) {
    invoice.description = response.description;
  }
  if (response.confirmedDate) {
    invoice.confirmedAt = new Date(response.confirmedDate);
  }
  if (response.creditDate) {
    invoice.creditDate = new Date(response.creditDate);
  }

  return invoice;
}

/**
 * Invoice DTO module export
 */
export const invoiceDto = {
  toInvoice,
};
