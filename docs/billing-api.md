# Billing API Reference

This document provides a complete API reference for the billing module.

## AsaasClient

The ASAAS API client for making requests to the ASAAS platform.

### Configuration

```typescript
interface AsaasClientConfig {
  apiKey: string;           // ASAAS API key
  environment: 'sandbox' | 'production';
  timeout?: number;         // Request timeout in ms (default: 30000)
}
```

### Customer Operations

#### createCustomer

```typescript
createCustomer(data: CreateCustomerDto): Promise<AsaasCustomerResponse>
```

Creates a new customer in ASAAS.

#### getCustomer

```typescript
getCustomer(customerId: string): Promise<AsaasCustomerResponse>
```

Retrieves a customer by ID.

#### updateCustomer

```typescript
updateCustomer(customerId: string, data: UpdateCustomerDto): Promise<AsaasCustomerResponse>
```

Updates an existing customer.

#### findCustomerByExternalReference

```typescript
findCustomerByExternalReference(externalReference: string): Promise<AsaasPaginatedResponse<AsaasCustomerResponse>>
```

Finds customers by external reference (e.g., tenant ID).

### Subscription Operations

#### createSubscription

```typescript
createSubscription(data: CreateSubscriptionDto): Promise<AsaasSubscriptionResponse>
```

Creates a new subscription.

#### getSubscription

```typescript
getSubscription(subscriptionId: string): Promise<AsaasSubscriptionResponse>
```

Retrieves a subscription by ID.

#### updateSubscription

```typescript
updateSubscription(subscriptionId: string, data: UpdateSubscriptionDto): Promise<AsaasSubscriptionResponse>
```

Updates an existing subscription.

#### cancelSubscription

```typescript
cancelSubscription(subscriptionId: string): Promise<{ deleted: boolean; id: string }>
```

Cancels (deletes) a subscription.

### Invoice Operations

#### listInvoices

```typescript
listInvoices(subscriptionId: string, params?: ListInvoicesDto): Promise<AsaasPaginatedResponse<AsaasInvoiceResponse>>
```

Lists invoices/payments for a subscription.

#### getPayment

```typescript
getPayment(paymentId: string): Promise<AsaasInvoiceResponse>
```

Retrieves a specific payment/invoice.

---

## BillingService

Main service for billing operations.

### Configuration

```typescript
interface BillingServiceConfig {
  asaasClient: AsaasClient;
  updateTenantBilling: UpdateTenantBillingCallback;
  getTenantBilling: GetTenantBillingCallback;
  defaultBillingType?: AsaasBillingType;  // Default: 'BOLETO'
  daysUntilSuspension?: number;            // Default: 15
  currency?: string;                       // Default: 'BRL'
}
```

### Methods

#### createCustomerForTenant

```typescript
createCustomerForTenant(tenant: BillableTenant): Promise<CreateCustomerResult>
```

Creates an ASAAS customer for a tenant. If customer already exists, returns existing.

#### initializeSubscription

```typescript
initializeSubscription(
  tenant: BillableTenant,
  plan: BillingPlan,
  options?: { billingType?: AsaasBillingType; startWithTrial?: boolean }
): Promise<InitializeSubscriptionResult>
```

Initializes a subscription for a tenant, creating customer if needed.

#### cancelSubscription

```typescript
cancelSubscription(tenantId: string): Promise<void>
```

Cancels a tenant's subscription.

#### syncSubscriptionStatus

```typescript
syncSubscriptionStatus(tenantId: string): Promise<TenantBillingData>
```

Syncs subscription status from ASAAS.

#### listInvoices

```typescript
listInvoices(tenantId: string, subscriptionId: string): Promise<Invoice[]>
```

Lists invoices for a tenant's subscription.

#### handlePaymentConfirmed

```typescript
handlePaymentConfirmed(tenantId: string, paymentDate: Date): Promise<void>
```

Handles payment confirmation, activating the tenant.

#### handlePaymentOverdue

```typescript
handlePaymentOverdue(tenantId: string, daysOverdue: number): Promise<void>
```

Handles payment overdue status.

---

## SubscriptionService

Manages subscription lifecycle operations.

### Configuration

```typescript
interface SubscriptionServiceConfig {
  asaasClient: AsaasClient;
  updateTenantBilling: UpdateTenantBillingCallback;
  getTenantBilling: GetTenantBillingCallback;
  defaultBillingType?: AsaasBillingType;
  daysUntilSuspension?: number;
}
```

### Methods

#### initializeSubscriptionForTenant

```typescript
initializeSubscriptionForTenant(options: InitializeSubscriptionOptions): Promise<InitializeSubscriptionResult>
```

#### cancelSubscription

```typescript
cancelSubscription(tenantId: string): Promise<void>
```

#### syncSubscriptionStatus

```typescript
syncSubscriptionStatus(tenantId: string): Promise<TenantBillingData>
```

#### handlePaymentConfirmed

```typescript
handlePaymentConfirmed(tenantId: string, paymentDate: Date): Promise<void>
```

#### handlePaymentOverdue

```typescript
handlePaymentOverdue(tenantId: string, daysOverdue: number): Promise<void>
```

---

## WebhookHandler

Handles ASAAS webhook events.

### Configuration

```typescript
interface WebhookHandlerConfig {
  billingService: BillingService;
  getTenantByCustomerId: (customerId: string) => Promise<TenantBillingData | null>;
  getTenantBySubscriptionId: (subscriptionId: string) => Promise<TenantBillingData | null>;
  webhookAccessToken?: string;
  daysUntilOverdueStatus?: number;
}
```

### Methods

#### handleEvent

```typescript
handleEvent(
  event: AsaasWebhookEvent,
  accessToken?: string
): Promise<WebhookProcessingResult>
```

Processes an ASAAS webhook event.

#### validateAccessToken

```typescript
validateAccessToken(token?: string): boolean
```

Validates the webhook access token.

---

## BillingEnforcer

Access control enforcement based on billing status.

### Configuration

```typescript
interface BillingEnforcerConfig {
  getTenantBilling: GetTenantBillingCallback;
  throwOnDenial?: boolean;  // Default: true
}
```

### Methods

#### getBillingContext

```typescript
getBillingContext(tenantId: string): Promise<BillingContext | null>
```

Gets billing context for ABAC policies.

#### requireActive

```typescript
requireActive(tenantId: string): Promise<boolean>
```

Requires tenant to have active or trial status.

#### inTrial

```typescript
inTrial(tenantId: string): Promise<boolean>
```

Checks if tenant is in trial period.

#### requireAnyAccess

```typescript
requireAnyAccess(tenantId: string): Promise<boolean>
```

Requires tenant to have any access (not suspended/canceled).

#### hasLimitedAccessOnly

```typescript
hasLimitedAccessOnly(tenantId: string): Promise<boolean>
```

Checks if tenant has limited access only.

#### isSuspendedOrCanceled

```typescript
isSuspendedOrCanceled(tenantId: string): Promise<boolean>
```

Checks if tenant is suspended or canceled.

#### getBillingStatus

```typescript
getBillingStatus(tenantId: string): Promise<BillingStatus | null>
```

Gets tenant billing status.

### Static Methods (for ABAC)

#### createActiveBillingPolicy

```typescript
static createActiveBillingPolicy(
  getTenantBilling: GetTenantBillingCallback
): (user: { tenant_id?: string }) => Promise<boolean>
```

Creates ABAC policy for active billing.

#### createAnyAccessBillingPolicy

```typescript
static createAnyAccessBillingPolicy(
  getTenantBilling: GetTenantBillingCallback
): (user: { tenant_id?: string }) => Promise<boolean>
```

Creates ABAC policy for any access.

#### createTrialBillingPolicy

```typescript
static createTrialBillingPolicy(
  getTenantBilling: GetTenantBillingCallback
): (user: { tenant_id?: string }) => Promise<boolean>
```

Creates ABAC policy for trial status.

---

## Types

### BillingStatus

```typescript
enum BillingStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  PENDING_PAYMENT = 'pending_payment',
  OVERDUE = 'overdue',
  SUSPENDED = 'suspended',
  CANCELED = 'canceled',
}
```

### BillingCycle

```typescript
enum BillingCycle {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMIANNUALLY = 'SEMIANNUALLY',
  YEARLY = 'YEARLY',
}
```

### BillingPlan

```typescript
interface BillingPlan {
  id: string;
  name: string;
  description: string;
  priceInCents: number;
  currency: string;
  cycle: BillingCycle;
  trialDays: number;
  features: string[];
  metadata: Record<string, unknown>;
  active: boolean;
}
```

### TenantBillingData

```typescript
interface TenantBillingData {
  id: string;
  asaasCustomerId?: string;
  asaasSubscriptionId?: string;
  billingStatus: BillingStatus;
  subscriptionMetadata?: SubscriptionMetadata;
}
```

### BillableTenant

```typescript
interface BillableTenant {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  address?: string;
  addressNumber?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  asaasCustomerId?: string;
  asaasSubscriptionId?: string;
  billingStatus: BillingStatus;
}
```

---

## Error Classes

### BillingError

Base error class for billing operations.

### SubscriptionCreationError

Thrown when subscription creation fails.

### SubscriptionCancellationError

Thrown when subscription cancellation fails.

### CustomerCreationError

Thrown when customer creation fails.

### PaymentOverdueError

Thrown when payment is overdue.

### WebhookInvalidError

Thrown when webhook validation fails.

### BillingStatusInvalidError

Thrown when billing status is invalid for an operation.

### AsaasApiError

Thrown when ASAAS API returns an error.

### InvalidBillingTransitionError

Thrown when an invalid status transition is attempted.
