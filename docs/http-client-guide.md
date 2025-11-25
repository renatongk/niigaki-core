# HTTP Client Guide

This guide covers the HTTP client and error handling features in `@niigaki/core`.

## Overview

The API module provides:

- **HTTP Client** - Standardized fetch wrapper with interceptors
- **Error Handler** - Unified error handling and response formatting
- **Custom Errors** - Typed error classes for common scenarios

## HTTP Client

### Basic Usage

```typescript
import { httpClient, createHttpClient } from '@niigaki/core';

// Use default client
const response = await httpClient.get('/api/users');
console.log(response.data);

// Create configured client
const api = createHttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 30000,
  defaultHeaders: {
    'X-API-Key': 'your-api-key',
  },
});
```

### HTTP Methods

```typescript
// GET request
const users = await client.get<User[]>('/users');

// GET with query parameters
const filtered = await client.get<User[]>('/users', {
  params: { status: 'active', page: 1 },
});

// POST request
const created = await client.post<User>('/users', {
  name: 'John Doe',
  email: 'john@example.com',
});

// PUT request
const updated = await client.put<User>('/users/123', {
  name: 'John Smith',
});

// PATCH request
const patched = await client.patch<User>('/users/123', {
  status: 'inactive',
});

// DELETE request
await client.delete('/users/123');
```

### Response Structure

```typescript
interface HttpResponse<T> {
  data: T;               // Response body
  status: number;        // HTTP status code
  statusText: string;    // Status text
  headers: Record<string, string>;  // Response headers
}

const response = await client.get<User>('/users/123');
console.log(response.data);      // User object
console.log(response.status);    // 200
console.log(response.headers);   // { 'content-type': 'application/json', ... }
```

### Request Configuration

```typescript
interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  body?: unknown;
  timeout?: number;
  signal?: AbortSignal;
  retry?: boolean;
  retryCount?: number;
  retryDelay?: number;
}

// Example with config
const response = await client.get('/api/data', {
  headers: {
    'Accept-Language': 'en-US',
  },
  params: {
    limit: 10,
    offset: 0,
  },
  timeout: 5000,
});
```

### Client Configuration

```typescript
const client = createHttpClient({
  // Base URL for all requests
  baseUrl: 'https://api.example.com/v1',
  
  // Default headers
  defaultHeaders: {
    'Content-Type': 'application/json',
    'X-API-Version': '2024-01',
  },
  
  // Default timeout (ms)
  timeout: 30000,
  
  // Interceptors
  requestInterceptors: [],
  responseInterceptors: [],
  errorInterceptors: [],
});
```

## Interceptors

### Request Interceptors

Modify requests before they're sent:

```typescript
import { httpClient, contextStore } from '@niigaki/core';

// Add correlation ID to all requests
httpClient.addRequestInterceptor((url, config) => {
  const ctx = contextStore.get();
  return {
    ...config,
    headers: {
      ...config.headers,
      'X-Correlation-ID': ctx?.correlationId ?? 'no-correlation',
    },
  };
});

// Add authentication
httpClient.addRequestInterceptor(async (url, config) => {
  const token = await getAuthToken();
  return {
    ...config,
    headers: {
      ...config.headers,
      'Authorization': `Bearer ${token}`,
    },
  };
});
```

### Response Interceptors

Transform responses after they're received:

```typescript
// Log all responses
httpClient.addResponseInterceptor((response) => {
  console.log(`Response: ${response.status} from ${response.url}`);
  return response;
});

// Transform data
httpClient.addResponseInterceptor((response) => {
  if (response.data?.items) {
    return {
      ...response,
      data: response.data.items,
    };
  }
  return response;
});
```

### Error Interceptors

Handle or transform errors:

```typescript
import { AppError, ErrorCode } from '@niigaki/core';

httpClient.addErrorInterceptor((error) => {
  // Handle token expiration
  if (error.code === ErrorCode.UNAUTHORIZED) {
    // Trigger re-authentication
    authService.refresh();
  }
  
  // Track errors
  errorTracker.capture(error);
  
  return error;
});
```

## Error Handling

### Error Codes

```typescript
enum ErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  
  // Business errors
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  STORE_NOT_FOUND = 'STORE_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INVALID_OPERATION = 'INVALID_OPERATION',
}
```

### AppError Class

```typescript
import { AppError, ErrorCode } from '@niigaki/core';

// Create error
const error = new AppError(
  ErrorCode.BAD_REQUEST,
  'Invalid input data',
  {
    details: { field: 'email', issue: 'invalid format' },
    correlationId: 'abc-123',
  }
);

// Access properties
console.log(error.code);        // 'BAD_REQUEST'
console.log(error.statusCode);  // 400
console.log(error.message);     // 'Invalid input data'
console.log(error.details);     // { field: 'email', issue: 'invalid format' }
console.log(error.isOperational); // true

// Convert to response
const response = error.toResponse();
// {
//   success: false,
//   error: {
//     code: 'BAD_REQUEST',
//     message: 'Invalid input data',
//     details: { field: 'email', issue: 'invalid format' },
//     correlationId: 'abc-123'
//   }
// }
```

### Specialized Error Classes

```typescript
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from '@niigaki/core';

// Validation error with field details
throw new ValidationError(
  'Validation failed',
  {
    email: ['Invalid format', 'Already exists'],
    password: ['Too short'],
  }
);

// Not found error
throw new NotFoundError('User', 'user-123');
// Message: "User with id 'user-123' not found"

// Unauthorized error
throw new UnauthorizedError('Token expired');

// Forbidden error
throw new ForbiddenError('Cannot delete admin users', 'delete_user');
```

### Handling HTTP Errors

```typescript
import { httpClient, AppError, ErrorCode, handleError } from '@niigaki/core';

try {
  const response = await httpClient.get('/api/resource');
  return response.data;
} catch (error) {
  if (error instanceof AppError) {
    switch (error.code) {
      case ErrorCode.NOT_FOUND:
        return null;
      case ErrorCode.UNAUTHORIZED:
        await refreshToken();
        return retry();
      case ErrorCode.RATE_LIMITED:
        await delay(1000);
        return retry();
      default:
        throw error;
    }
  }
  throw error;
}
```

### Global Error Handler

```typescript
import { handleError, isOperationalError, getErrorStatus } from '@niigaki/core';

// Express error handler
app.use((err, req, res, next) => {
  const correlationId = req.correlationId;
  
  // Check if operational vs programming error
  if (isOperationalError(err)) {
    // Known error - return formatted response
    const response = handleError(err, correlationId);
    res.status(getErrorStatus(err)).json(response);
  } else {
    // Unknown error - log and return generic message
    logger.error('unhandled_error', { correlationId }, err);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        correlationId,
      },
    });
  }
});
```

### Converting Errors

```typescript
// Convert generic Error to AppError
const appError = AppError.fromError(
  new Error('Something went wrong'),
  ErrorCode.INTERNAL_ERROR,
  correlationId
);
```

## Integration Patterns

### Tenant-Aware Client

```typescript
import { createHttpClient, getCurrentTenantId, contextStore } from '@niigaki/core';

const tenantClient = createHttpClient({
  baseUrl: process.env.API_URL,
});

tenantClient.addRequestInterceptor((url, config) => ({
  ...config,
  headers: {
    ...config.headers,
    'X-Tenant-ID': getCurrentTenantId(),
    'X-Correlation-ID': contextStore.get()?.correlationId ?? '',
  },
}));
```

### Authenticated Client

```typescript
const authClient = createHttpClient({
  baseUrl: process.env.API_URL,
});

authClient.addRequestInterceptor(async (url, config) => {
  const token = await authService.getAccessToken();
  
  return {
    ...config,
    headers: {
      ...config.headers,
      'Authorization': `Bearer ${token}`,
    },
  };
});

// Refresh token on 401
authClient.addErrorInterceptor(async (error) => {
  if (error.code === ErrorCode.UNAUTHORIZED) {
    const refreshed = await authService.refreshToken();
    if (refreshed) {
      // Signal to retry the request
      error.retry = true;
    }
  }
  return error;
});
```

### Logging Integration

```typescript
import { httpClient, logger, contextStore } from '@niigaki/core';

// Request logging
httpClient.addRequestInterceptor((url, config) => {
  const ctx = contextStore.get();
  logger.debug('http_request', `${config.method ?? 'GET'} ${url}`, {
    correlationId: ctx?.correlationId,
    headers: config.headers,
  });
  return config;
});

// Response logging
httpClient.addResponseInterceptor((response) => {
  const ctx = contextStore.get();
  logger.debug('http_response', `${response.status}`, {
    correlationId: ctx?.correlationId,
    status: response.status,
  });
  return response;
});
```

### Retry Logic

```typescript
const retryClient = createHttpClient({
  baseUrl: process.env.API_URL,
});

async function requestWithRetry<T>(
  method: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await method();
    } catch (error) {
      lastError = error as Error;
      
      if (error instanceof AppError) {
        // Don't retry client errors
        if (error.statusCode < 500 && error.code !== ErrorCode.TIMEOUT) {
          throw error;
        }
      }
      
      // Exponential backoff
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw lastError;
}

// Usage
const data = await requestWithRetry(() => 
  retryClient.get('/api/unreliable-endpoint')
);
```

## Best Practices

### 1. Use Typed Responses

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

// Type the response
const response = await client.get<User>('/users/123');
const user: User = response.data;
```

### 2. Handle All Error Cases

```typescript
try {
  const result = await client.post('/api/action', data);
  return { success: true, data: result.data };
} catch (error) {
  if (error instanceof AppError) {
    return { success: false, error: error.toResponse() };
  }
  // Unknown error
  return {
    success: false,
    error: handleError(error),
  };
}
```

### 3. Use Interceptors for Cross-Cutting Concerns

```typescript
// Add to all clients
function setupStandardInterceptors(client: HttpClient) {
  // Correlation ID
  client.addRequestInterceptor(addCorrelationId);
  
  // Authentication
  client.addRequestInterceptor(addAuthHeader);
  
  // Error tracking
  client.addErrorInterceptor(trackError);
  
  // Metrics
  client.addResponseInterceptor(recordMetrics);
}
```

### 4. Create Domain-Specific Clients

```typescript
// User service client
const userClient = createHttpClient({
  baseUrl: `${API_URL}/users`,
});

export const userApi = {
  get: (id: string) => userClient.get<User>(`/${id}`),
  list: (params?: ListParams) => userClient.get<User[]>('/', { params }),
  create: (data: CreateUser) => userClient.post<User>('/', data),
  update: (id: string, data: UpdateUser) => userClient.put<User>(`/${id}`, data),
  delete: (id: string) => userClient.delete(`/${id}`),
};
```

### 5. Set Appropriate Timeouts

```typescript
// Fast endpoint
const fastClient = createHttpClient({ timeout: 5000 });

// Slow report endpoint
const reportClient = createHttpClient({ timeout: 60000 });
```

### 6. Use AbortController for Cancellation

```typescript
const controller = new AbortController();

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  const response = await client.get('/api/slow', {
    signal: controller.signal,
  });
} catch (error) {
  if (error instanceof AppError && error.code === ErrorCode.TIMEOUT) {
    console.log('Request was cancelled');
  }
}
```
