/**
 * HTTP Client Module
 * Standardized HTTP client wrapper with interceptors and error handling.
 */

import { AppError, ErrorCode, handleError } from './error-handler';
import { logger } from '../logging/logger';
import { contextStore } from '../logging/log-context';

/**
 * HTTP methods supported
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Request configuration
 */
export interface RequestConfig {
  /** Request headers */
  headers?: Record<string, string>;
  /** Query parameters */
  params?: Record<string, string | number | boolean>;
  /** Request body (will be JSON stringified) */
  body?: unknown;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Abort signal */
  signal?: AbortSignal;
  /** Whether to retry on failure */
  retry?: boolean;
  /** Number of retries */
  retryCount?: number;
  /** Delay between retries in ms */
  retryDelay?: number;
}

/**
 * Response structure
 */
export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * Request interceptor function type
 */
export type RequestInterceptor = (
  url: string,
  config: RequestConfig
) => RequestConfig | Promise<RequestConfig>;

/**
 * Response interceptor function type
 */
export type ResponseInterceptor = <T>(
  response: HttpResponse<T>
) => HttpResponse<T> | Promise<HttpResponse<T>>;

/**
 * Error interceptor function type
 */
export type ErrorInterceptor = (error: AppError) => AppError | Promise<AppError>;

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
  /** Base URL for all requests */
  baseUrl?: string;
  /** Default headers */
  defaultHeaders?: Record<string, string>;
  /** Default timeout in milliseconds */
  timeout?: number;
  /** Request interceptors */
  requestInterceptors?: RequestInterceptor[];
  /** Response interceptors */
  responseInterceptors?: ResponseInterceptor[];
  /** Error interceptors */
  errorInterceptors?: ErrorInterceptor[];
}

/**
 * Default timeout (30 seconds)
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * HTTP Client class
 */
export class HttpClient {
  private config: HttpClientConfig;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  constructor(config: HttpClientConfig = {}) {
    this.config = {
      timeout: DEFAULT_TIMEOUT,
      ...config,
    };

    if (config.requestInterceptors) {
      this.requestInterceptors = [...config.requestInterceptors];
    }
    if (config.responseInterceptors) {
      this.responseInterceptors = [...config.responseInterceptors];
    }
    if (config.errorInterceptors) {
      this.errorInterceptors = [...config.errorInterceptors];
    }
  }

  /**
   * Add a request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add a response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Add an error interceptor
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
    let url = this.config.baseUrl ? `${this.config.baseUrl}${path}` : path;

    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        searchParams.append(key, String(value));
      }
      url += `?${searchParams.toString()}`;
    }

    return url;
  }

  /**
   * Apply request interceptors
   */
  private async applyRequestInterceptors(
    url: string,
    config: RequestConfig
  ): Promise<RequestConfig> {
    let currentConfig = config;
    for (const interceptor of this.requestInterceptors) {
      currentConfig = await interceptor(url, currentConfig);
    }
    return currentConfig;
  }

  /**
   * Apply response interceptors
   */
  private async applyResponseInterceptors<T>(
    response: HttpResponse<T>
  ): Promise<HttpResponse<T>> {
    let currentResponse = response;
    for (const interceptor of this.responseInterceptors) {
      currentResponse = await interceptor(currentResponse);
    }
    return currentResponse;
  }

  /**
   * Apply error interceptors
   */
  private async applyErrorInterceptors(error: AppError): Promise<AppError> {
    let currentError = error;
    for (const interceptor of this.errorInterceptors) {
      currentError = await interceptor(currentError);
    }
    return currentError;
  }

  /**
   * Make an HTTP request
   */
  async request<T = unknown>(
    method: HttpMethod,
    path: string,
    config: RequestConfig = {}
  ): Promise<HttpResponse<T>> {
    const operationName = `http:${method}:${path}`;
    const ctx = contextStore.get();
    const correlationId = ctx?.correlationId;

    logger.start(operationName, { correlationId, method, path });

    try {
      // Apply request interceptors
      const processedConfig = await this.applyRequestInterceptors(path, config);

      // Build URL
      const url = this.buildUrl(path, processedConfig.params);

      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.config.defaultHeaders,
        ...processedConfig.headers,
      };

      // Add correlation ID header if available
      if (correlationId) {
        headers['X-Correlation-ID'] = correlationId;
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeout = processedConfig.timeout ?? this.config.timeout ?? DEFAULT_TIMEOUT;
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const fetchOptions: RequestInit = {
          method,
          headers,
          signal: processedConfig.signal ?? controller.signal,
        };

        // Add body for non-GET requests
        if (method !== 'GET' && processedConfig.body !== undefined) {
          fetchOptions.body = JSON.stringify(processedConfig.body);
        }

        const response = await fetch(url, fetchOptions);

        clearTimeout(timeoutId);

        // Parse response headers
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        // Parse response body
        let data: T;
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          data = (await response.json()) as T;
        } else {
          data = (await response.text()) as T;
        }

        // Check for error status
        if (!response.ok) {
          const errorCode = this.mapStatusToErrorCode(response.status);
          const errorMessage =
            typeof data === 'object' && data !== null && 'message' in data
              ? String((data as Record<string, unknown>)['message'])
              : `HTTP ${response.status}: ${response.statusText}`;

          const errorOptions: { details: Record<string, unknown>; correlationId?: string } = {
            details: { status: response.status, data },
          };
          if (correlationId) {
            errorOptions.correlationId = correlationId;
          }
          throw new AppError(errorCode, errorMessage, errorOptions);
        }

        // Build response object
        let httpResponse: HttpResponse<T> = {
          data,
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        };

        // Apply response interceptors
        httpResponse = await this.applyResponseInterceptors(httpResponse);

        logger.end(operationName, { correlationId, status: httpResponse.status });

        return httpResponse;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err) {
      let appError: AppError;

      if (err instanceof AppError) {
        appError = err;
      } else if (err instanceof Error) {
        if (err.name === 'AbortError') {
          const errorOptions: { cause: Error; correlationId?: string } = {
            cause: err,
          };
          if (correlationId) {
            errorOptions.correlationId = correlationId;
          }
          appError = new AppError(ErrorCode.TIMEOUT, 'Request timed out', errorOptions);
        } else {
          appError = AppError.fromError(err, ErrorCode.INTERNAL_ERROR, correlationId);
        }
      } else {
        const errorOptions: { correlationId?: string } = {};
        if (correlationId) {
          errorOptions.correlationId = correlationId;
        }
        appError = new AppError(ErrorCode.INTERNAL_ERROR, 'Unknown error occurred', errorOptions);
      }

      // Apply error interceptors
      appError = await this.applyErrorInterceptors(appError);

      logger.error(operationName, { correlationId }, appError);

      throw appError;
    }
  }

  /**
   * Map HTTP status code to error code
   */
  private mapStatusToErrorCode(status: number): ErrorCode {
    switch (status) {
      case 400:
        return ErrorCode.BAD_REQUEST;
      case 401:
        return ErrorCode.UNAUTHORIZED;
      case 403:
        return ErrorCode.FORBIDDEN;
      case 404:
        return ErrorCode.NOT_FOUND;
      case 409:
        return ErrorCode.CONFLICT;
      case 422:
        return ErrorCode.VALIDATION_ERROR;
      case 429:
        return ErrorCode.RATE_LIMITED;
      case 503:
        return ErrorCode.SERVICE_UNAVAILABLE;
      case 504:
        return ErrorCode.TIMEOUT;
      default:
        return status >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.BAD_REQUEST;
    }
  }

  /**
   * GET request
   */
  get<T = unknown>(path: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>('GET', path, config);
  }

  /**
   * POST request
   */
  post<T = unknown>(
    path: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<HttpResponse<T>> {
    return this.request<T>('POST', path, { ...config, body });
  }

  /**
   * PUT request
   */
  put<T = unknown>(
    path: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', path, { ...config, body });
  }

  /**
   * PATCH request
   */
  patch<T = unknown>(
    path: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<HttpResponse<T>> {
    return this.request<T>('PATCH', path, { ...config, body });
  }

  /**
   * DELETE request
   */
  delete<T = unknown>(path: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', path, config);
  }
}

/**
 * Create a new HTTP client instance
 */
export function createHttpClient(config?: HttpClientConfig): HttpClient {
  return new HttpClient(config);
}

/**
 * Default HTTP client instance
 */
export const httpClient = new HttpClient();

/**
 * HTTP client module export
 */
export { handleError };
