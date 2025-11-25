/**
 * ASAAS Event Types
 * Defines webhook events and their payloads from ASAAS.
 */

/**
 * ASAAS webhook event types.
 */
export enum AsaasEventType {
  // Payment events
  PAYMENT_CREATED = 'PAYMENT_CREATED',
  PAYMENT_AWAITING_RISK_ANALYSIS = 'PAYMENT_AWAITING_RISK_ANALYSIS',
  PAYMENT_APPROVED_BY_RISK_ANALYSIS = 'PAYMENT_APPROVED_BY_RISK_ANALYSIS',
  PAYMENT_REPROVED_BY_RISK_ANALYSIS = 'PAYMENT_REPROVED_BY_RISK_ANALYSIS',
  PAYMENT_UPDATED = 'PAYMENT_UPDATED',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_ANTICIPATED = 'PAYMENT_ANTICIPATED',
  PAYMENT_OVERDUE = 'PAYMENT_OVERDUE',
  PAYMENT_DELETED = 'PAYMENT_DELETED',
  PAYMENT_RESTORED = 'PAYMENT_RESTORED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  PAYMENT_RECEIVED_IN_CASH_UNDONE = 'PAYMENT_RECEIVED_IN_CASH_UNDONE',
  PAYMENT_CHARGEBACK_REQUESTED = 'PAYMENT_CHARGEBACK_REQUESTED',
  PAYMENT_CHARGEBACK_DISPUTE = 'PAYMENT_CHARGEBACK_DISPUTE',
  PAYMENT_AWAITING_CHARGEBACK_REVERSAL = 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
  PAYMENT_DUNNING_RECEIVED = 'PAYMENT_DUNNING_RECEIVED',
  PAYMENT_DUNNING_REQUESTED = 'PAYMENT_DUNNING_REQUESTED',

  // Subscription events
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_ACTIVATED = 'SUBSCRIPTION_ACTIVATED',
  SUBSCRIPTION_UPDATED = 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_CANCELED = 'SUBSCRIPTION_CANCELED',
  SUBSCRIPTION_RENEWED = 'SUBSCRIPTION_RENEWED',

  // Transfer events
  TRANSFER_CREATED = 'TRANSFER_CREATED',
  TRANSFER_PENDING = 'TRANSFER_PENDING',
  TRANSFER_IN_BANK_PROCESSING = 'TRANSFER_IN_BANK_PROCESSING',
  TRANSFER_BLOCKED = 'TRANSFER_BLOCKED',
  TRANSFER_DONE = 'TRANSFER_DONE',
  TRANSFER_FAILED = 'TRANSFER_FAILED',
  TRANSFER_CANCELLED = 'TRANSFER_CANCELLED',

  // Invoice events
  INVOICE_CREATED = 'INVOICE_CREATED',
  INVOICE_UPDATED = 'INVOICE_UPDATED',
  INVOICE_SYNCHRONIZED = 'INVOICE_SYNCHRONIZED',
  INVOICE_AUTHORIZED = 'INVOICE_AUTHORIZED',
  INVOICE_PROCESSING_CANCELLATION = 'INVOICE_PROCESSING_CANCELLATION',
  INVOICE_CANCELED = 'INVOICE_CANCELED',
  INVOICE_CANCELLATION_DENIED = 'INVOICE_CANCELLATION_DENIED',
  INVOICE_ERROR = 'INVOICE_ERROR',
}

/**
 * Payment status from ASAAS.
 */
export enum AsaasPaymentStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  CONFIRMED = 'CONFIRMED',
  OVERDUE = 'OVERDUE',
  REFUNDED = 'REFUNDED',
  RECEIVED_IN_CASH = 'RECEIVED_IN_CASH',
  REFUND_REQUESTED = 'REFUND_REQUESTED',
  CHARGEBACK_REQUESTED = 'CHARGEBACK_REQUESTED',
  CHARGEBACK_DISPUTE = 'CHARGEBACK_DISPUTE',
  AWAITING_CHARGEBACK_REVERSAL = 'AWAITING_CHARGEBACK_REVERSAL',
  DUNNING_REQUESTED = 'DUNNING_REQUESTED',
  DUNNING_RECEIVED = 'DUNNING_RECEIVED',
  AWAITING_RISK_ANALYSIS = 'AWAITING_RISK_ANALYSIS',
}

/**
 * Subscription status from ASAAS.
 */
export enum AsaasSubscriptionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
}

/**
 * Base ASAAS webhook event structure.
 */
export interface AsaasWebhookEvent<T = unknown> {
  /** Event type */
  event: AsaasEventType;
  /** Payload data */
  payment?: T;
  subscription?: T;
  transfer?: T;
  invoice?: T;
}

/**
 * ASAAS payment object from webhook.
 */
export interface AsaasPaymentPayload {
  id: string;
  customer: string;
  subscription?: string;
  value: number;
  netValue: number;
  originalValue?: number;
  description?: string;
  billingType: string;
  status: AsaasPaymentStatus;
  dueDate: string;
  originalDueDate?: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  invoiceUrl?: string;
  invoiceNumber?: string;
  externalReference?: string;
  confirmedDate?: string;
  creditDate?: string;
  estimatedCreditDate?: string;
  deleted: boolean;
  anticipated: boolean;
  anticipable: boolean;
  refunds?: Array<{
    dateCreated: string;
    status: string;
    value: number;
    description?: string;
  }>;
}

/**
 * ASAAS subscription object from webhook.
 */
export interface AsaasSubscriptionPayload {
  id: string;
  customer: string;
  value: number;
  nextDueDate?: string;
  cycle: string;
  description?: string;
  status: AsaasSubscriptionStatus;
  billingType: string;
  externalReference?: string;
  deleted: boolean;
}

/**
 * Type guard to check if a string is a valid AsaasEventType.
 * @param value - The value to check
 * @returns true if the value is a valid AsaasEventType
 */
export function isAsaasEventType(value: unknown): value is AsaasEventType {
  return Object.values(AsaasEventType).includes(value as AsaasEventType);
}

/**
 * Check if an event type is a payment event.
 * @param eventType - The event type to check
 * @returns true if it's a payment event
 */
export function isPaymentEvent(eventType: AsaasEventType): boolean {
  return eventType.startsWith('PAYMENT_');
}

/**
 * Check if an event type is a subscription event.
 * @param eventType - The event type to check
 * @returns true if it's a subscription event
 */
export function isSubscriptionEvent(eventType: AsaasEventType): boolean {
  return eventType.startsWith('SUBSCRIPTION_');
}

/**
 * Required events for billing system functionality.
 */
export const requiredAsaasEvents: AsaasEventType[] = [
  AsaasEventType.PAYMENT_CREATED,
  AsaasEventType.PAYMENT_CONFIRMED,
  AsaasEventType.PAYMENT_RECEIVED,
  AsaasEventType.PAYMENT_OVERDUE,
  AsaasEventType.PAYMENT_REFUNDED,
  AsaasEventType.SUBSCRIPTION_ACTIVATED,
  AsaasEventType.SUBSCRIPTION_CANCELED,
];

/**
 * ASAAS events module export
 */
export const asaasEvents = {
  AsaasEventType,
  AsaasPaymentStatus,
  AsaasSubscriptionStatus,
  isAsaasEventType,
  isPaymentEvent,
  isSubscriptionEvent,
  requiredAsaasEvents,
};
