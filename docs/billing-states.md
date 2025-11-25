# Billing States

This document describes the billing status state machine used in the billing module.

## Overview

The billing module uses a state machine to manage tenant billing status. Valid transitions are enforced to maintain consistency between ASAAS and your application.

## States

### trial

**Description**: Tenant is in a free trial period.

**Access Level**: Full access to all features.

**Duration**: Configured per plan (e.g., 14 days).

**Entry Points**:
- New subscription with trial enabled

**Exit Points**:
- → `active`: First payment confirmed
- → `pending_payment`: Trial ends without subscription
- → `canceled`: Tenant cancels during trial

### pending_payment

**Description**: Waiting for first payment after registration or trial.

**Access Level**: Limited access (depends on implementation).

**Entry Points**:
- New subscription without trial
- Trial period ended

**Exit Points**:
- → `active`: Payment confirmed
- → `overdue`: Payment due date passed
- → `canceled`: Tenant cancels

### active

**Description**: Subscription is active with all payments current.

**Access Level**: Full access to all features.

**Entry Points**:
- Payment confirmed
- Reactivation from overdue (payment received)

**Exit Points**:
- → `overdue`: Payment past due
- → `canceled`: Subscription canceled

### overdue

**Description**: Payment is past due but tenant still has limited access.

**Access Level**: Limited access (read-only, reduced features, etc.).

**Duration**: Until payment or suspension threshold (default: 15 days).

**Entry Points**:
- Payment due date passed

**Exit Points**:
- → `active`: Payment received
- → `suspended`: Overdue threshold exceeded
- → `canceled`: Subscription canceled

### suspended

**Description**: Account suspended due to prolonged non-payment.

**Access Level**: No access (blocked).

**Entry Points**:
- Extended overdue period (configurable, default 15 days)

**Exit Points**:
- → `active`: Outstanding payment received
- → `canceled`: Subscription terminated

### canceled

**Description**: Subscription has been canceled.

**Access Level**: No access.

**Final State**: No transitions out of canceled.

**Entry Points**:
- Any state (user-initiated cancellation)
- ASAAS subscription cancellation

## State Machine Diagram

```
                         ┌─────────────────────────────────────┐
                         │                                     │
                         ▼                                     │
┌─────────────────────────────────────────────────────────────┐│
│                                                             ││
│                        TRIAL                                ││
│                                                             ││
│     Full Access | Duration: Plan.trialDays                  ││
│                                                             ││
└─────────────────────────────────────────────────────────────┘│
         │                    │                    │            │
         │ Payment            │ Trial Ends         │ Cancel     │
         │ Confirmed          │                    │            │
         ▼                    ▼                    │            │
┌──────────────────┐  ┌──────────────────┐        │            │
│                  │  │                  │        │            │
│      ACTIVE      │  │ PENDING_PAYMENT  │        │            │
│                  │  │                  │        │            │
│   Full Access    │  │  Limited Access  │        │            │
│                  │  │                  │        │            │
└──────────────────┘  └──────────────────┘        │            │
    │       ▲              │       │               │            │
    │       │              │       │               │            │
    │ Payment  Payment     │Payment │ Cancel       │            │
    │ Overdue  Confirmed   │Overdue │              │            │
    │       │              │       │               │            │
    ▼       │              ▼       │               │            │
┌──────────────────────────────────┘               │            │
│                                                  │            │
│                  OVERDUE                         │            │
│                                                  │            │
│    Limited Access | Duration: Until Payment      │            │
│                     or Suspension                │            │
│                                                  │            │
└──────────────────────────────────────────────────┘            │
         │           │            │                             │
         │ Payment   │ Days >     │ Cancel                      │
         │ Received  │ Threshold  │                             │
         │           │            │                             │
         ▼           ▼            │                             │
    (→ ACTIVE) ┌──────────────────┘                             │
               │                                                │
               │              SUSPENDED                         │
               │                                                │
               │     No Access | Blocked                        │
               │                                                │
               └────────────────────────────────────────────────┘
                          │            │
                          │ Payment    │ Cancel/
                          │ Received   │ Terminate
                          │            │
                          ▼            ▼
                     (→ ACTIVE)   ┌──────────────────┐
                                  │                  │
                                  │    CANCELED      │
                                  │                  │
                                  │    No Access     │
                                  │   (Final State)  │
                                  │                  │
                                  └──────────────────┘
```

## Transition Matrix

| From \ To | trial | pending | active | overdue | suspended | canceled |
|-----------|-------|---------|--------|---------|-----------|----------|
| trial     | -     | ✓       | ✓      | ✗       | ✗         | ✓        |
| pending   | ✗     | -       | ✓      | ✓       | ✗         | ✓        |
| active    | ✗     | ✗       | -      | ✓       | ✗         | ✓        |
| overdue   | ✗     | ✗       | ✓      | -       | ✓         | ✓        |
| suspended | ✗     | ✗       | ✓      | ✗       | -         | ✓        |
| canceled  | ✗     | ✗       | ✗      | ✗       | ✗         | -        |

## Access Level Matrix

| Status | Read | Write | Premium | Admin | Billing |
|--------|------|-------|---------|-------|---------|
| trial | ✓ | ✓ | ✓ | ✓ | ✗ |
| active | ✓ | ✓ | ✓ | ✓ | ✓ |
| pending | ✓ | ✗ | ✗ | ✗ | ✓ |
| overdue | ✓ | ✗ | ✗ | ✗ | ✓ |
| suspended | ✗ | ✗ | ✗ | ✗ | ✓ |
| canceled | ✗ | ✗ | ✗ | ✗ | ✗ |

*Note: Access levels are suggestions. Implement according to your business requirements.*

## Enforcing State Transitions

The billing module provides utilities for enforcing transitions:

```typescript
import { 
  isValidTransition, 
  BillingStatus,
  InvalidBillingTransitionError 
} from '@niigaki/core';

// Check if transition is valid
if (!isValidTransition(currentStatus, newStatus)) {
  throw new InvalidBillingTransitionError(currentStatus, newStatus);
}
```

## Access Enforcement

Use the BillingEnforcer for access control:

```typescript
import { createBillingEnforcer, BillingStatus } from '@niigaki/core';

const enforcer = createBillingEnforcer({
  getTenantBilling: getTenantFromDatabase,
  throwOnDenial: true,
});

// Require full access (active or trial)
await enforcer.requireActive(tenantId);

// Require any access (not suspended/canceled)
await enforcer.requireAnyAccess(tenantId);

// Check specific states
const isInTrial = await enforcer.inTrial(tenantId);
const hasLimited = await enforcer.hasLimitedAccessOnly(tenantId);
const isBlocked = await enforcer.isSuspendedOrCanceled(tenantId);
```

## Integration with ABAC

Create billing-aware ABAC policies:

```typescript
import { BillingEnforcer, createPolicy, registerPolicy } from '@niigaki/core';

// Create billing policy
const activeBillingPolicy = BillingEnforcer.createActiveBillingPolicy(
  getTenantFromDatabase
);

// Register as ABAC policy
registerPolicy(createPolicy(
  'billing_active',
  async (user, resource, context) => {
    return await activeBillingPolicy(user);
  }
));

// Use in authorization
const canAccess = await evaluate(user, resource, context, 'billing_active');
```

## Webhook-Driven Transitions

State transitions are primarily driven by ASAAS webhooks:

| Event | Typical Transition |
|-------|-------------------|
| PAYMENT_CONFIRMED | → active |
| PAYMENT_OVERDUE | → overdue |
| SUBSCRIPTION_CANCELED | → canceled |

The WebhookHandler automatically manages these transitions while respecting the state machine rules.
