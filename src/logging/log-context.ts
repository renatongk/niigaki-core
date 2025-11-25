/**
 * Log Context Module
 * Manages correlation IDs and contextual logging information.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Log context data structure
 */
export interface LogContext {
  /** Unique correlation ID for request tracing */
  correlationId: string;
  /** Tenant identifier */
  tenantId?: string | undefined;
  /** Store identifier */
  storeId?: string | undefined;
  /** User identifier */
  userId?: string | undefined;
  /** Request path or operation name */
  operation?: string | undefined;
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Create a new log context
 * @param initialContext - Optional initial context values
 * @returns New LogContext with generated correlation ID
 */
export function createLogContext(
  initialContext?: Partial<Omit<LogContext, 'correlationId' | 'metadata'>> & {
    metadata?: Record<string, unknown>;
  }
): LogContext {
  return {
    correlationId: uuidv4(),
    tenantId: initialContext?.tenantId,
    storeId: initialContext?.storeId,
    userId: initialContext?.userId,
    operation: initialContext?.operation,
    metadata: initialContext?.metadata ?? {},
  };
}

/**
 * Clone a log context with optional overrides
 * @param context - Existing context to clone
 * @param overrides - Values to override
 * @returns New LogContext with merged values
 */
export function cloneLogContext(
  context: LogContext,
  overrides?: Partial<LogContext>
): LogContext {
  return {
    ...context,
    ...overrides,
    metadata: {
      ...context.metadata,
      ...overrides?.metadata,
    },
  };
}

/**
 * Add metadata to a context
 * @param context - Existing context
 * @param key - Metadata key
 * @param value - Metadata value
 * @returns New LogContext with added metadata
 */
export function addMetadata(
  context: LogContext,
  key: string,
  value: unknown
): LogContext {
  return {
    ...context,
    metadata: {
      ...context.metadata,
      [key]: value,
    },
  };
}

/**
 * Format context for log output
 * @param context - Log context to format
 * @returns Formatted string for logging
 */
export function formatContext(context: LogContext): string {
  const parts: string[] = [`[${context.correlationId}]`];

  if (context.tenantId) {
    parts.push(`tenant:${context.tenantId}`);
  }
  if (context.storeId) {
    parts.push(`store:${context.storeId}`);
  }
  if (context.userId) {
    parts.push(`user:${context.userId}`);
  }
  if (context.operation) {
    parts.push(`op:${context.operation}`);
  }

  return parts.join(' ');
}

/**
 * Async local storage for context propagation
 * This allows automatic correlation ID propagation across async operations
 */
class ContextStore {
  private current: LogContext | null = null;

  /**
   * Set the current context
   */
  set(context: LogContext): void {
    this.current = context;
  }

  /**
   * Get the current context
   */
  get(): LogContext | null {
    return this.current;
  }

  /**
   * Get the current context or create a new one
   */
  getOrCreate(): LogContext {
    if (!this.current) {
      this.current = createLogContext();
    }
    return this.current;
  }

  /**
   * Clear the current context
   */
  clear(): void {
    this.current = null;
  }

  /**
   * Run a function with a specific context
   */
  run<T>(context: LogContext, fn: () => T): T {
    const previous = this.current;
    this.current = context;
    try {
      return fn();
    } finally {
      this.current = previous;
    }
  }

  /**
   * Run an async function with a specific context
   */
  async runAsync<T>(context: LogContext, fn: () => Promise<T>): Promise<T> {
    const previous = this.current;
    this.current = context;
    try {
      return await fn();
    } finally {
      this.current = previous;
    }
  }
}

/**
 * Global context store instance
 */
export const contextStore = new ContextStore();

/**
 * Log context module export
 */
export const logContext = {
  createLogContext,
  cloneLogContext,
  addMetadata,
  formatContext,
  contextStore,
};
