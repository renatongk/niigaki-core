# Billing Flows

This document describes the main billing flows in the ASAAS billing module.

## 1. Tenant Creation → Customer Creation

When a new tenant registers, an ASAAS customer should be created.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Create Tenant  │───▶│ Create Customer │───▶│ Save Customer ID│
│  (Database)     │    │ (ASAAS API)     │    │ (Database)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │
                                               Log: billing.customer.created
```

### Code Example

```typescript
// After creating tenant in your system
const customerResult = await billingService.createCustomerForTenant({
  id: tenant.id,
  name: tenant.name,
  email: tenant.email,
  cpfCnpj: tenant.taxId,
  billingStatus: BillingStatus.PENDING_PAYMENT,
});

// customerResult contains:
// - customerId: ASAAS customer ID
// - customer: Full ASAAS customer object
```

## 2. Subscription Activation

When a tenant selects a plan, create a subscription in ASAAS.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Select Plan    │───▶│ Create Sub      │───▶│ Update Tenant   │
│                 │    │ (ASAAS API)     │    │ Status          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │
                                            Status: trial or pending_payment
```

### Code Example

```typescript
const plan: BillingPlan = {
  id: 'plan-pro',
  name: 'Pro Plan',
  priceInCents: 19990,
  currency: 'BRL',
  cycle: BillingCycle.MONTHLY,
  trialDays: 14,
  features: ['unlimited-users', 'api-access'],
  metadata: {},
  active: true,
};

const result = await billingService.initializeSubscription(tenant, plan, {
  billingType: 'BOLETO',
  startWithTrial: true,
});

// result contains:
// - subscriptionId: ASAAS subscription ID
// - billingStatus: TRIAL (if trial) or PENDING_PAYMENT
// - metadata: Subscription metadata
```

## 3. Monthly Renewal (ASAAS → Core)

When ASAAS generates a new invoice, the webhook handler processes it.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ ASAAS Creates   │───▶│ Webhook:        │───▶│ Register        │
│ Invoice         │    │ PAYMENT_CREATED │    │ Invoice         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Customer Pays   │───▶│ Webhook:        │───▶│ Tenant → ACTIVE │
│                 │    │ PAYMENT_CONFIRMED    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Webhook Handler

The webhook handler automatically processes these events:

```typescript
// PAYMENT_CREATED - Log the new invoice
// PAYMENT_CONFIRMED - Activate tenant
await webhookHandler.handleEvent(webhookPayload);
```

## 4. Payment Overdue Flow

When a payment becomes overdue, ASAAS sends a webhook.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Due Date Passes │───▶│ Webhook:        │───▶│ Tenant → OVERDUE│
│                 │    │ PAYMENT_OVERDUE │    │ Limited Access  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         │ (Days > threshold)
         ▼
┌─────────────────┐    ┌─────────────────┐
│ Extended Overdue│───▶│ Tenant →        │
│                 │    │ SUSPENDED       │
└─────────────────┘    └─────────────────┘
```

### Configuration

```typescript
const billingService = createBillingService({
  // ...
  daysUntilSuspension: 15, // Days overdue before suspension
});
```

## 5. Subscription Cancellation

Cancellation can be initiated by the tenant or externally.

### Initiated by Tenant

```typescript
await billingService.cancelSubscription(tenantId);
// Tenant status → CANCELED
```

### External Cancellation (via Webhook)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Cancel in ASAAS │───▶│ Webhook:        │───▶│ Tenant →        │
│ Dashboard       │    │ SUBSCRIPTION_   │    │ CANCELED        │
│                 │    │ CANCELED        │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 6. Reactivation Flow

When an overdue tenant pays, they can be reactivated.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Tenant Pays     │───▶│ Webhook:        │───▶│ Tenant → ACTIVE │
│ Overdue Invoice │    │ PAYMENT_CONFIRMED    │ Full Access     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## State Transitions

The billing module enforces valid state transitions:

```
                    ┌───────────┐
                    │   TRIAL   │
                    └─────┬─────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
┌─────────────────┐ ┌───────────┐ ┌───────────────┐
│ PENDING_PAYMENT │ │  ACTIVE   │ │   CANCELED    │
└────────┬────────┘ └─────┬─────┘ └───────────────┘
         │                │                ▲
         ├────────────────┤                │
         ▼                ▼                │
   ┌───────────┐    ┌───────────┐         │
   │  ACTIVE   │    │  OVERDUE  │─────────┤
   └───────────┘    └─────┬─────┘         │
                          │                │
                          ▼                │
                    ┌───────────┐         │
                    │ SUSPENDED │─────────┘
                    └───────────┘
```

## Error Handling

All billing operations use specialized error classes:

```typescript
try {
  await billingService.initializeSubscription(tenant, plan);
} catch (error) {
  if (error instanceof SubscriptionCreationError) {
    console.error(`Failed for tenant ${error.tenantId}`);
  }
  if (error instanceof CustomerCreationError) {
    console.error(`Customer creation failed for tenant ${error.tenantId}`);
  }
}
```

## Logging

All billing operations are logged with correlation IDs:

```
[INFO] [corr-123] [billing.createCustomer] Starting operation
[INFO] [corr-123] [billing.createCustomer] Completed operation (245ms)
```
