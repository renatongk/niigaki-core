# Logging Guide

This guide covers the universal logging system in `@niigaki/core`.

## Overview

The logging module provides:

- **Structured logging** with operation tracking
- **Correlation IDs** for request tracing
- **Automatic timing** of operations
- **Flexible output** formats and destinations
- **Context propagation** across async operations

## Quick Start

```typescript
import { logger } from '@niigaki/core';

// Log operation start and end
logger.start('processOrder');
// ... do work ...
logger.end('processOrder');

// Log with context
logger.info('processOrder', 'Order validated successfully', { orderId: '123' });

// Log errors
try {
  await riskyOperation();
} catch (error) {
  logger.error('processOrder', { orderId: '123' }, error);
}
```

## Log Context

Log context carries correlation information across operations:

```typescript
import { createLogContext, contextStore } from '@niigaki/core';

// Create context
const ctx = createLogContext({
  tenantId: 'tenant-abc',
  storeId: 'store-xyz',
  userId: 'user-123',
  operation: 'checkout',
});

// Set globally
contextStore.set(ctx);

// Or run in scope
contextStore.run(ctx, () => {
  // All logs here will include the context
  logger.info('step1', 'Processing...');
});
```

### Context Properties

```typescript
interface LogContext {
  correlationId: string;   // Auto-generated UUID
  tenantId?: string;       // Tenant identifier
  storeId?: string;        // Store identifier
  userId?: string;         // User identifier
  operation?: string;      // Current operation name
  metadata: Record<string, unknown>;  // Additional data
}
```

### Cloning and Extending Context

```typescript
import { cloneLogContext, addMetadata } from '@niigaki/core';

// Clone with overrides
const childCtx = cloneLogContext(ctx, {
  operation: 'checkout.payment',
});

// Add metadata
const enrichedCtx = addMetadata(ctx, 'paymentMethod', 'credit_card');
```

## Logger Functions

### Start and End Operations

Track operation timing automatically:

```typescript
logger.start('fetchUserData');

const data = await fetchData();

logger.end('fetchUserData');  // Logs duration automatically
```

Output:
```
2024-01-15T10:30:00.000Z [INFO] [abc-123] [fetchUserData] Starting operation: fetchUserData
2024-01-15T10:30:00.150Z [INFO] [abc-123] [fetchUserData] Completed operation: fetchUserData (150ms)
```

### Log Levels

```typescript
// Debug - detailed diagnostic info
logger.debug('operation', 'Debug details', { debugData: 'value' });

// Info - general operational info
logger.info('operation', 'Processing started');

// Warn - warning conditions
logger.warn('operation', 'Retrying after timeout', { attempt: 2 });

// Error - error conditions
logger.error('operation', context, new Error('Something failed'));
```

### Error Logging

```typescript
try {
  await processPayment();
} catch (error) {
  // Logs error with stack trace and operation duration
  logger.error('processPayment', { paymentId: '123' }, error);
}

// String errors
logger.error('operation', null, 'Something went wrong');
```

## Configuration

### Configure Logger

```typescript
import { logger, LogLevel, LogDestination } from '@niigaki/core';

logger.configure({
  // Minimum level to output
  minLevel: LogLevel.INFO,
  
  // Output destinations
  destinations: [LogDestination.CONSOLE],
  
  // Include timestamps
  includeTimestamp: true,
  
  // Output as JSON
  jsonFormat: true,
  
  // Custom handler
  customHandler: (entry) => {
    // Send to external service
    sendToDatadog(entry);
  },
});
```

### Log Levels

```typescript
enum LogLevel {
  DEBUG = 'debug',  // Most verbose
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',  // Least verbose
}
```

### Output Destinations

```typescript
enum LogDestination {
  CONSOLE = 'console',   // console.log/error/warn
  TERMINAL = 'terminal', // Same as console
  FILE = 'file',         // Future: file output
}
```

### Reset Configuration

```typescript
// Reset to defaults
logger.resetConfig();
```

## Log Entry Structure

```typescript
interface LogEntry {
  timestamp: string;     // ISO 8601 timestamp
  level: LogLevel;       // Log level
  correlationId: string; // Correlation ID
  operation: string;     // Operation name
  message: string;       // Log message
  context?: Record<string, unknown>;  // Additional context
  duration?: number;     // Duration in ms (for start/end)
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}
```

## Child Loggers

Create loggers with preset context:

```typescript
const orderLogger = logger.createChildLogger({
  tenantId: 'tenant-1',
  storeId: 'store-1',
});

// All logs include tenant and store
orderLogger.info('createOrder', 'Order created', { orderId: '123' });
orderLogger.error('createOrder', new Error('Payment failed'));
```

## Output Formats

### Text Format (Default)

```
2024-01-15T10:30:00.000Z [INFO] [correlation-id] [operation] Message {"key": "value"}
```

### JSON Format

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "correlationId": "abc-123-def",
  "operation": "createOrder",
  "message": "Order created successfully",
  "context": {
    "orderId": "order-456",
    "tenantId": "tenant-1"
  },
  "duration": 150
}
```

## Integration Patterns

### Express Middleware

```typescript
import express from 'express';
import { createLogContext, contextStore, logger } from '@niigaki/core';

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  const ctx = createLogContext({
    tenantId: req.headers['x-tenant-id'] as string,
    userId: req.user?.id,
    operation: `${req.method} ${req.path}`,
    metadata: {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    },
  });

  contextStore.set(ctx);
  
  // Log request start
  logger.start(`${req.method} ${req.path}`, ctx);

  // Log on response
  res.on('finish', () => {
    logger.end(`${req.method} ${req.path}`, {
      ...ctx,
      statusCode: res.statusCode,
    });
  });

  next();
});
```

### Async Operations

```typescript
import { contextStore } from '@niigaki/core';

// Context propagates through async/await
async function processOrder(orderId: string) {
  const ctx = contextStore.get();
  
  logger.start('processOrder', ctx);
  
  await validateOrder(orderId);  // Context available in nested calls
  await processPayment(orderId);
  await sendConfirmation(orderId);
  
  logger.end('processOrder', ctx);
}
```

### Error Handler Integration

```typescript
import { logger, handleError, AppError } from '@niigaki/core';

function errorHandler(err, req, res, next) {
  const ctx = contextStore.get();
  
  // Log the error
  logger.error('request', ctx, err);
  
  // Convert to response
  const response = handleError(err, ctx?.correlationId);
  
  res.status(err instanceof AppError ? err.statusCode : 500).json(response);
}
```

## Best Practices

### 1. Always Use Operation Names

```typescript
// Good - clear operation names
logger.start('user.create');
logger.start('order.processPayment');
logger.start('inventory.reserve');

// Bad - vague names
logger.start('process');
logger.start('doStuff');
```

### 2. Include Relevant Context

```typescript
// Good - includes identifiers and context
logger.info('order.create', 'Order created', {
  orderId: order.id,
  customerId: customer.id,
  total: order.total,
});

// Bad - no context
logger.info('order.create', 'Order created');
```

### 3. Use Structured Data

```typescript
// Good - structured data
logger.info('payment', 'Payment processed', {
  amount: 99.99,
  currency: 'USD',
  method: 'credit_card',
});

// Bad - unstructured string
logger.info('payment', `Payment of $99.99 USD via credit card`);
```

### 4. Log at Appropriate Levels

```typescript
// DEBUG - Detailed debugging info
logger.debug('cache', 'Cache miss', { key: 'user:123' });

// INFO - Notable events
logger.info('auth', 'User logged in', { userId: '123' });

// WARN - Potential issues
logger.warn('rateLimit', 'Approaching rate limit', { remaining: 5 });

// ERROR - Actual errors
logger.error('payment', ctx, paymentError);
```

### 5. Use Child Loggers for Services

```typescript
class PaymentService {
  private logger = logger.createChildLogger({
    operation: 'PaymentService',
  });

  async processPayment(orderId: string) {
    this.logger.start('processPayment');
    // ...
    this.logger.end('processPayment');
  }
}
```

### 6. Include Correlation ID in External Calls

```typescript
const response = await httpClient.post('/api/orders', data, {
  headers: {
    'X-Correlation-ID': ctx.correlationId,
  },
});
```

## Debugging

### Enable Debug Logging

```typescript
logger.configure({ minLevel: LogLevel.DEBUG });
```

### Filter by Operation

```typescript
logger.configure({
  customHandler: (entry) => {
    if (entry.operation.startsWith('payment')) {
      console.log(JSON.stringify(entry, null, 2));
    }
  },
});
```

### Timing Operations

```typescript
logger.start('slowOperation');
const result = await slowOperation();
logger.end('slowOperation');  // Shows duration

// Output: Completed operation: slowOperation (1523ms)
```
