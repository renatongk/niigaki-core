# Billing Overview

This document provides an overview of the ASAAS billing module in the `@niigaki/core` library.

## Introduction

The billing module provides a standardized way to manage subscriptions, payments, and tenant billing status through the ASAAS payment platform. It is designed to be reusable across all SaaS products in the Niigaki ecosystem.

## Key Features

- **ASAAS Integration**: Full client for the ASAAS API (customers, subscriptions, payments)
- **Billing Status Management**: Track tenant billing status (trial, active, overdue, suspended, canceled)
- **Webhook Handling**: Process ASAAS webhook events and update tenant status
- **Billing Enforcer**: ABAC-compatible access control based on billing status
- **Error Handling**: Specialized error classes for billing operations

## Module Structure

```
billing/
├── types/
│   ├── billing-status.ts    # Billing status enum and utilities
│   ├── billing-plan.ts      # Billing plan and cycle definitions
│   └── asaas-events.ts      # ASAAS webhook event types
├── dtos/
│   ├── customer.dto.ts      # Customer DTOs and validation
│   ├── subscription.dto.ts  # Subscription DTOs and validation
│   └── invoice.dto.ts       # Invoice DTOs and conversion
├── billing-errors.ts        # Custom error classes
├── asaas-client.ts          # ASAAS API client
├── subscription-service.ts  # Subscription lifecycle management
├── billing-service.ts       # Main billing service
├── webhook-handler.ts       # ASAAS webhook handler
└── billing-enforcer.ts      # Access control enforcer
```

## Quick Start

### 1. Initialize the ASAAS Client

```typescript
import { createAsaasClient } from '@niigaki/core';

const asaasClient = createAsaasClient({
  apiKey: process.env.ASAAS_API_KEY,
  environment: 'sandbox', // or 'production'
});
```

### 2. Create the Billing Service

```typescript
import { createBillingService } from '@niigaki/core';

const billingService = createBillingService({
  asaasClient,
  updateTenantBilling: async (tenantId, data) => {
    // Update your database
    await db.tenant.update({ where: { id: tenantId }, data });
  },
  getTenantBilling: async (tenantId) => {
    // Fetch from your database
    return await db.tenant.findUnique({ where: { id: tenantId } });
  },
});
```

### 3. Create a Customer and Subscription

```typescript
// Create customer for a new tenant
const tenant = {
  id: 'tenant-123',
  name: 'Acme Inc',
  email: 'billing@acme.com',
  cpfCnpj: '12345678000199',
  billingStatus: BillingStatus.PENDING_PAYMENT,
};

const plan = {
  id: 'plan-basic',
  name: 'Basic Plan',
  priceInCents: 9990,
  currency: 'BRL',
  cycle: BillingCycle.MONTHLY,
  trialDays: 14,
  features: ['feature1', 'feature2'],
  metadata: {},
  active: true,
};

// Initialize subscription with trial
const result = await billingService.initializeSubscription(tenant, plan, {
  startWithTrial: true,
});
```

### 4. Handle Webhooks

```typescript
import { createWebhookHandler } from '@niigaki/core';

const webhookHandler = createWebhookHandler({
  billingService,
  getTenantByCustomerId: async (customerId) => {
    return await db.tenant.findFirst({ 
      where: { asaasCustomerId: customerId } 
    });
  },
  getTenantBySubscriptionId: async (subscriptionId) => {
    return await db.tenant.findFirst({ 
      where: { asaasSubscriptionId: subscriptionId } 
    });
  },
  webhookAccessToken: process.env.ASAAS_WEBHOOK_TOKEN,
});

// In your webhook endpoint
app.post('/webhook/asaas', async (req, res) => {
  const result = await webhookHandler.handleEvent(
    req.body,
    req.headers['asaas-access-token']
  );
  res.json(result);
});
```

### 5. Enforce Access Based on Billing

```typescript
import { createBillingEnforcer } from '@niigaki/core';

const enforcer = createBillingEnforcer({
  getTenantBilling: async (tenantId) => {
    return await db.tenant.findUnique({ where: { id: tenantId } });
  },
  throwOnDenial: true,
});

// In your middleware
async function requireActiveBilling(req, res, next) {
  const tenantId = req.user.tenant_id;
  await enforcer.requireActive(tenantId); // Throws if not active
  next();
}
```

## Billing Status States

| Status | Description | Access Level |
|--------|-------------|--------------|
| `trial` | Free trial period | Full |
| `active` | Subscription active, payments current | Full |
| `pending_payment` | Waiting for first payment | Limited |
| `overdue` | Payment is past due | Limited |
| `suspended` | Account suspended due to non-payment | None |
| `canceled` | Subscription canceled | None |

## Related Documentation

- [Billing Flows](./billing-flows.md) - Detailed billing flow documentation
- [Billing Webhooks](./billing-webhooks.md) - Webhook event handling
- [Billing API](./billing-api.md) - API reference
- [Billing States](./billing-states.md) - State machine documentation
