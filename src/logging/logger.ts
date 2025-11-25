/**
 * Universal Logger Module
 * Provides standardized logging with start/end operation tracking and correlation IDs.
 */

import {
  type LogContext,
  createLogContext,
  contextStore,
} from './log-context';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Log output destination
 */
export enum LogDestination {
  CONSOLE = 'console',
  TERMINAL = 'terminal',
  FILE = 'file',
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  correlationId: string;
  operation: string;
  message: string;
  context?: Record<string, unknown> | undefined;
  duration?: number | undefined;
  error?: {
    name: string;
    message: string;
    stack?: string | undefined;
  } | undefined;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  minLevel: LogLevel;
  /** Output destinations */
  destinations: LogDestination[];
  /** Whether to include timestamps */
  includeTimestamp: boolean;
  /** Whether to format output as JSON */
  jsonFormat: boolean;
  /** Custom log handler */
  customHandler?: (entry: LogEntry) => void;
}

/**
 * Default logger configuration
 */
const defaultConfig: LoggerConfig = {
  minLevel: LogLevel.INFO,
  destinations: [LogDestination.CONSOLE],
  includeTimestamp: true,
  jsonFormat: false,
};

/**
 * Current logger configuration
 */
let config: LoggerConfig = { ...defaultConfig };

/**
 * Map of active operations and their start times
 */
const activeOperations = new Map<string, number>();

/**
 * Log level priority for filtering
 */
const levelPriority: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

/**
 * Configure the logger
 * @param newConfig - Partial configuration to apply
 */
export function configure(newConfig: Partial<LoggerConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Reset logger to default configuration
 */
export function resetConfig(): void {
  config = { ...defaultConfig };
}

/**
 * Format a log entry for output
 */
function formatEntry(entry: LogEntry): string {
  if (config.jsonFormat) {
    return JSON.stringify(entry);
  }

  const parts: string[] = [];

  if (config.includeTimestamp) {
    parts.push(entry.timestamp);
  }

  parts.push(`[${entry.level.toUpperCase()}]`);
  parts.push(`[${entry.correlationId}]`);
  parts.push(`[${entry.operation}]`);
  parts.push(entry.message);

  if (entry.duration !== undefined) {
    parts.push(`(${entry.duration}ms)`);
  }

  if (entry.context && Object.keys(entry.context).length > 0) {
    parts.push(JSON.stringify(entry.context));
  }

  if (entry.error) {
    parts.push(`\n  Error: ${entry.error.name}: ${entry.error.message}`);
    if (entry.error.stack) {
      parts.push(`\n  ${entry.error.stack}`);
    }
  }

  return parts.join(' ');
}

/**
 * Output a log entry to configured destinations
 */
function output(entry: LogEntry): void {
  // Check log level
  if (levelPriority[entry.level] < levelPriority[config.minLevel]) {
    return;
  }

  const formatted = formatEntry(entry);

  // Custom handler takes precedence
  if (config.customHandler) {
    config.customHandler(entry);
    return;
  }

  // Output to configured destinations
  for (const dest of config.destinations) {
    switch (dest) {
      case LogDestination.CONSOLE:
      case LogDestination.TERMINAL:
        switch (entry.level) {
          case LogLevel.ERROR:
            console.error(formatted);
            break;
          case LogLevel.WARN:
            console.warn(formatted);
            break;
          case LogLevel.DEBUG:
            console.debug(formatted);
            break;
          default:
            console.log(formatted);
        }
        break;
      case LogDestination.FILE:
        // File logging would be implemented with a file handler
        // For now, fall back to console
        console.log(formatted);
        break;
    }
  }
}

/**
 * Create a log entry
 */
function createEntry(
  level: LogLevel,
  operation: string,
  message: string,
  context?: LogContext | Record<string, unknown>,
  duration?: number,
  error?: Error
): LogEntry {
  const ctx = contextStore.get();
  const correlationId =
    (context as LogContext)?.correlationId ??
    ctx?.correlationId ??
    'no-correlation';

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    correlationId,
    operation,
    message,
    duration,
  };

  // Add context if provided
  if (context) {
    const { correlationId: _cid, ...rest } = context as LogContext &
      Record<string, unknown>;
    if (Object.keys(rest).length > 0) {
      entry.context = rest as Record<string, unknown>;
    }
  }

  // Add error if provided
  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return entry;
}

/**
 * Generate a unique operation key for tracking
 */
function getOperationKey(operation: string, context?: LogContext): string {
  const correlationId = context?.correlationId ?? contextStore.get()?.correlationId ?? 'global';
  return `${correlationId}:${operation}`;
}

/**
 * Log the start of an operation
 * @param operation - Name of the operation
 * @param context - Optional context or additional data
 */
export function start(
  operation: string,
  context?: LogContext | Record<string, unknown>
): void {
  const opKey = getOperationKey(operation, context as LogContext);
  activeOperations.set(opKey, Date.now());

  const entry = createEntry(
    LogLevel.INFO,
    operation,
    `Starting operation: ${operation}`,
    context
  );
  output(entry);
}

/**
 * Log the end of an operation
 * @param operation - Name of the operation
 * @param context - Optional context or additional data
 */
export function end(
  operation: string,
  context?: LogContext | Record<string, unknown>
): void {
  const opKey = getOperationKey(operation, context as LogContext);
  const startTime = activeOperations.get(opKey);
  const duration = startTime ? Date.now() - startTime : undefined;
  activeOperations.delete(opKey);

  const entry = createEntry(
    LogLevel.INFO,
    operation,
    `Completed operation: ${operation}`,
    context,
    duration
  );
  output(entry);
}

/**
 * Log an error in an operation
 * @param operation - Name of the operation
 * @param context - Optional context or additional data
 * @param error - Error that occurred
 */
export function error(
  operation: string,
  context: LogContext | Record<string, unknown> | null,
  err: Error | string
): void {
  const opKey = getOperationKey(operation, context as LogContext);
  const startTime = activeOperations.get(opKey);
  const duration = startTime ? Date.now() - startTime : undefined;
  activeOperations.delete(opKey);

  const errorObj = typeof err === 'string' ? new Error(err) : err;

  const entry = createEntry(
    LogLevel.ERROR,
    operation,
    `Error in operation: ${operation}`,
    context ?? undefined,
    duration,
    errorObj
  );
  output(entry);
}

/**
 * Log a debug message
 */
export function debug(
  operation: string,
  message: string,
  context?: LogContext | Record<string, unknown>
): void {
  const entry = createEntry(LogLevel.DEBUG, operation, message, context);
  output(entry);
}

/**
 * Log an info message
 */
export function info(
  operation: string,
  message: string,
  context?: LogContext | Record<string, unknown>
): void {
  const entry = createEntry(LogLevel.INFO, operation, message, context);
  output(entry);
}

/**
 * Log a warning message
 */
export function warn(
  operation: string,
  message: string,
  context?: LogContext | Record<string, unknown>
): void {
  const entry = createEntry(LogLevel.WARN, operation, message, context);
  output(entry);
}

/**
 * Create a child logger with preset context
 * @param baseContext - Base context for all logs from this logger
 * @returns Logger functions bound to the context
 */
export function createChildLogger(baseContext: Partial<LogContext>) {
  const ctx = createLogContext(baseContext);

  return {
    start: (operation: string, additionalContext?: Record<string, unknown>) =>
      start(operation, { ...ctx, ...additionalContext }),
    end: (operation: string, additionalContext?: Record<string, unknown>) =>
      end(operation, { ...ctx, ...additionalContext }),
    error: (
      operation: string,
      err: Error | string,
      additionalContext?: Record<string, unknown>
    ) => error(operation, { ...ctx, ...additionalContext }, err),
    debug: (
      operation: string,
      message: string,
      additionalContext?: Record<string, unknown>
    ) => debug(operation, message, { ...ctx, ...additionalContext }),
    info: (
      operation: string,
      message: string,
      additionalContext?: Record<string, unknown>
    ) => info(operation, message, { ...ctx, ...additionalContext }),
    warn: (
      operation: string,
      message: string,
      additionalContext?: Record<string, unknown>
    ) => warn(operation, message, { ...ctx, ...additionalContext }),
    context: ctx,
  };
}

/**
 * Logger module export object
 */
export const logger = {
  start,
  end,
  error,
  debug,
  info,
  warn,
  configure,
  resetConfig,
  createChildLogger,
  LogLevel,
  LogDestination,
};
