/**
 * Error Handler Module
 * Standardized error handling and response formatting.
 */

/**
 * Standard error codes
 */
export enum ErrorCode {
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

  // Business logic errors
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  STORE_NOT_FOUND = 'STORE_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INVALID_OPERATION = 'INVALID_OPERATION',
}

/**
 * HTTP status codes mapping
 */
const errorCodeToStatus: Record<ErrorCode, number> = {
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.VALIDATION_ERROR]: 422,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.TIMEOUT]: 504,
  [ErrorCode.TENANT_NOT_FOUND]: 404,
  [ErrorCode.STORE_NOT_FOUND]: 404,
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.PERMISSION_DENIED]: 403,
  [ErrorCode.INVALID_OPERATION]: 400,
};

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown> | undefined;
    correlationId?: string | undefined;
  };
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown> | undefined;
  public readonly correlationId?: string | undefined;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      details?: Record<string, unknown> | undefined;
      correlationId?: string | undefined;
      cause?: Error | undefined;
      isOperational?: boolean | undefined;
    }
  ) {
    super(message, { cause: options?.cause });
    this.name = 'AppError';
    this.code = code;
    this.statusCode = errorCodeToStatus[code] ?? 500;
    this.details = options?.details;
    this.correlationId = options?.correlationId;
    this.isOperational = options?.isOperational ?? true;

    // Maintain proper stack trace
    Error.captureStackTrace?.(this, AppError);
  }

  /**
   * Convert to error response object
   */
  toResponse(): ErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        correlationId: this.correlationId,
      },
    };
  }

  /**
   * Create from a generic error
   */
  static fromError(
    error: Error,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    correlationId?: string
  ): AppError {
    if (error instanceof AppError) {
      return error;
    }

    return new AppError(code, error.message, {
      cause: error,
      correlationId,
      isOperational: false,
    });
  }
}

/**
 * Validation error with field-level details
 */
export class ValidationError extends AppError {
  public readonly fieldErrors: Record<string, string[]>;

  constructor(
    message: string,
    fieldErrors: Record<string, string[]>,
    correlationId?: string
  ) {
    super(ErrorCode.VALIDATION_ERROR, message, {
      details: { fieldErrors },
      correlationId,
    });
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(
    resourceType: string,
    resourceId: string,
    correlationId?: string
  ) {
    super(ErrorCode.NOT_FOUND, `${resourceType} with id '${resourceId}' not found`, {
      details: { resourceType, resourceId },
      correlationId,
    });
    this.name = 'NotFoundError';
  }
}

/**
 * Unauthorized error
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required', correlationId?: string) {
    const options: { correlationId?: string } = {};
    if (correlationId) {
      options.correlationId = correlationId;
    }
    super(ErrorCode.UNAUTHORIZED, message, options);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends AppError {
  constructor(
    message: string = 'Access denied',
    action?: string,
    correlationId?: string
  ) {
    const options: { details?: Record<string, unknown>; correlationId?: string } = {};
    if (action) {
      options.details = { action };
    }
    if (correlationId) {
      options.correlationId = correlationId;
    }
    super(ErrorCode.FORBIDDEN, message, options);
    this.name = 'ForbiddenError';
  }
}

/**
 * Handle an error and return a standardized response
 * @param error - Error to handle
 * @param correlationId - Optional correlation ID
 * @returns Error response object
 */
export function handleError(
  error: unknown,
  correlationId?: string
): ErrorResponse {
  if (error instanceof AppError) {
    return error.toResponse();
  }

  if (error instanceof Error) {
    const appError = AppError.fromError(error, ErrorCode.INTERNAL_ERROR, correlationId);
    return appError.toResponse();
  }

  // Unknown error type
  const response: ErrorResponse = {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
    },
  };

  if (correlationId) {
    response.error.correlationId = correlationId;
  }

  return response;
}

/**
 * Check if an error is operational (expected) vs programming error
 * @param error - Error to check
 * @returns true if error is operational
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Get HTTP status code from error
 * @param error - Error to get status from
 * @returns HTTP status code
 */
export function getErrorStatus(error: unknown): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  return 500;
}

/**
 * Error handler module export
 */
export const errorHandler = {
  ErrorCode,
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  handleError,
  isOperationalError,
  getErrorStatus,
};
