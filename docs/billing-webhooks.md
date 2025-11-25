# Billing Webhooks

This document describes how to handle ASAAS webhooks in the billing module.

## Overview

The webhook handler processes events from ASAAS and updates tenant billing status accordingly. It validates incoming events, maps them to internal actions, and maintains consistency between ASAAS and your database.

## Setting Up the Webhook Handler

```typescript
import { 
  createWebhookHandler,
  createBillingService,
  createAsaasClient 
} from '@niigaki/core';

// Create the billing infrastructure
const asaasClient = createAsaasClient({
  apiKey: process.env.ASAAS_API_KEY,
  environment: 'production',
});

const billingService = createBillingService({
  asaasClient,
  updateTenantBilling: updateTenantInDatabase,
  getTenantBilling: getTenantFromDatabase,
});

// Create webhook handler
const webhookHandler = createWebhookHandler({
  billingService,
  getTenantByCustomerId: async (customerId) => {
    return await db.tenant.findFirst({
      where: { asaasCustomerId: customerId },
    });
  },
  getTenantBySubscriptionId: async (subscriptionId) => {
    return await db.tenant.findFirst({
      where: { asaasSubscriptionId: subscriptionId },
    });
  },
  webhookAccessToken: process.env.ASAAS_WEBHOOK_TOKEN, // Optional
  daysUntilOverdueStatus: 1,
});
```

## Webhook Endpoint

Expose an endpoint to receive ASAAS webhooks:

```typescript
// Express example
app.post('/webhook/asaas', async (req, res) => {
  try {
    const accessToken = req.headers['asaas-access-token'];
    const result = await webhookHandler.handleEvent(req.body, accessToken);
    
    res.json({
      success: result.success,
      action: result.action,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});
```

## Required Events

The following events must be configured in your ASAAS webhook settings:

| Event | Purpose | Tenant Action |
|-------|---------|---------------|
| `PAYMENT_CREATED` | New invoice created | Log invoice |
| `PAYMENT_CONFIRMED` | Payment received | Activate tenant |
| `PAYMENT_RECEIVED` | Payment received | Activate tenant |
| `PAYMENT_OVERDUE` | Payment past due | Mark overdue |
| `PAYMENT_REFUNDED` | Payment refunded | Log refund |
| `SUBSCRIPTION_ACTIVATED` | Subscription started | Sync status |
| `SUBSCRIPTION_CANCELED` | Subscription ended | Cancel tenant |

## Event Processing

### PAYMENT_CREATED

Logs the new invoice for reference. No status change.

```typescript
// Webhook payload
{
  "event": "PAYMENT_CREATED",
  "payment": {
    "id": "pay_123",
    "customer": "cus_456",
    "subscription": "sub_789",
    "value": 99.90,
    "dueDate": "2024-02-01"
  }
}

// Result
{
  "success": true,
  "eventType": "PAYMENT_CREATED",
  "tenantId": "tenant-123",
  "action": "payment_registered"
}
```

### PAYMENT_CONFIRMED / PAYMENT_RECEIVED

Activates the tenant when payment is confirmed.

```typescript
// Webhook payload
{
  "event": "PAYMENT_CONFIRMED",
  "payment": {
    "id": "pay_123",
    "customer": "cus_456",
    "status": "CONFIRMED",
    "confirmedDate": "2024-01-15"
  }
}

// Result
{
  "success": true,
  "eventType": "PAYMENT_CONFIRMED",
  "tenantId": "tenant-123",
  "action": "tenant_activated"
}
```

### PAYMENT_OVERDUE

Marks tenant as overdue. May suspend if overdue too long.

```typescript
// Webhook payload
{
  "event": "PAYMENT_OVERDUE",
  "payment": {
    "id": "pay_123",
    "customer": "cus_456",
    "dueDate": "2024-01-01"
  }
}

// Result
{
  "success": true,
  "eventType": "PAYMENT_OVERDUE",
  "tenantId": "tenant-123",
  "action": "tenant_overdue" // or "overdue_warning"
}
```

### PAYMENT_REFUNDED

Logs the refund. Additional business logic may be required.

```typescript
// Webhook payload
{
  "event": "PAYMENT_REFUNDED",
  "payment": {
    "id": "pay_123",
    "customer": "cus_456",
    "value": 99.90
  }
}

// Result
{
  "success": true,
  "eventType": "PAYMENT_REFUNDED",
  "tenantId": "tenant-123",
  "action": "refund_registered"
}
```

### SUBSCRIPTION_ACTIVATED

Syncs subscription status from ASAAS.

```typescript
// Webhook payload
{
  "event": "SUBSCRIPTION_ACTIVATED",
  "subscription": {
    "id": "sub_123",
    "customer": "cus_456",
    "status": "ACTIVE"
  }
}

// Result
{
  "success": true,
  "eventType": "SUBSCRIPTION_ACTIVATED",
  "tenantId": "tenant-123",
  "action": "subscription_synced"
}
```

### SUBSCRIPTION_CANCELED

Cancels the tenant's subscription.

```typescript
// Webhook payload
{
  "event": "SUBSCRIPTION_CANCELED",
  "subscription": {
    "id": "sub_123",
    "customer": "cus_456",
    "status": "INACTIVE"
  }
}

// Result
{
  "success": true,
  "eventType": "SUBSCRIPTION_CANCELED",
  "tenantId": "tenant-123",
  "action": "tenant_canceled"
}
```

## Security

### Access Token Validation

Configure a webhook access token in ASAAS and validate it:

```typescript
const webhookHandler = createWebhookHandler({
  // ...
  webhookAccessToken: process.env.ASAAS_WEBHOOK_TOKEN,
});

// In your endpoint
const accessToken = req.headers['asaas-access-token'];
const result = await webhookHandler.handleEvent(req.body, accessToken);
// Throws WebhookInvalidError if token doesn't match
```

### IP Whitelisting

Consider whitelisting ASAAS IP addresses in your firewall/load balancer.

## Error Handling

The webhook handler returns structured results:

```typescript
interface WebhookProcessingResult {
  success: boolean;
  eventType: AsaasEventType;
  tenantId?: string;
  action?: string;
  error?: string;
}
```

### Error Scenarios

- **Invalid Token**: Returns `success: false` with error message
- **Unknown Event Type**: Throws `WebhookInvalidError`
- **Tenant Not Found**: Returns `success: true` with `action: 'tenant_not_found'`
- **Processing Error**: Returns `success: false` with error details

## Testing Webhooks

Use the ASAAS sandbox environment for testing:

```typescript
const asaasClient = createAsaasClient({
  apiKey: process.env.ASAAS_SANDBOX_API_KEY,
  environment: 'sandbox',
});
```

### Manual Testing

Send test webhook payloads using curl:

```bash
curl -X POST http://localhost:3000/webhook/asaas \
  -H "Content-Type: application/json" \
  -H "asaas-access-token: your-token" \
  -d '{
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "id": "pay_test_123",
      "customer": "cus_test_456",
      "status": "CONFIRMED"
    }
  }'
```

## Retry Logic

ASAAS retries webhooks that fail. Ensure your endpoint:

1. Returns 200 status for successful processing
2. Returns 200 even for unknown tenants (acknowledge receipt)
3. Returns 500 only for transient errors that should be retried
