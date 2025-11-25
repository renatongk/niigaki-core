/**
 * @niigaki/core - Foundation Library for Niigaki Software House
 *
 * This package provides core functionality used across all Niigaki products:
 * - Authentication (RBAC + ABAC)
 * - JWT Claims generation
 * - Multi-tenant helpers
 * - Universal logging
 * - HTTP client
 * - Error handling
 * - Common utilities
 */

// Auth module exports
export {
  // RBAC
  Role,
  Action,
  can,
  canAny,
  getPermissions,
  getAllPermissions,
  hasHigherPrivilege,
  rbac,
} from './auth/rbac';

export {
  // ABAC
  type AbacUser,
  type AbacResource,
  type AbacContext,
  type PolicyFunction,
  type Policy,
  type PolicyResult,
  builtInPolicies,
  evaluate,
  evaluateAll,
  checkAll,
  checkAny,
  registerPolicy,
  createPolicy,
  abac,
} from './auth/abac';

export {
  // JWT Claims
  type ClaimsUser,
  type NiigakiClaims,
  type ClaimsOptions,
  buildClaims,
  buildSupabaseClaims,
  extractUserFromClaims,
  validateClaims,
  isExpired,
  jwtClaims,
} from './auth/jwt-claims';

export {
  // Permissions
  PermissionScope,
  type Permission,
  type PermissionContext,
  type ResourceContext,
  hasPermission,
  isResourceOwner,
  getEffectivePermissions,
  formatPermission,
  parsePermission,
  permissions,
} from './auth/permissions';

// Logging module exports
export {
  // Logger
  LogLevel,
  LogDestination,
  type LogEntry,
  type LoggerConfig,
  configure as configureLogger,
  resetConfig as resetLoggerConfig,
  start as logStart,
  end as logEnd,
  error as logError,
  debug as logDebug,
  info as logInfo,
  warn as logWarn,
  createChildLogger,
  logger,
} from './logging/logger';

export {
  // Log Context
  type LogContext,
  createLogContext,
  cloneLogContext,
  addMetadata,
  formatContext,
  contextStore,
  logContext,
} from './logging/log-context';

// API module exports
export {
  // Error Handler
  ErrorCode,
  type ErrorResponse,
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  handleError,
  isOperationalError,
  getErrorStatus,
  errorHandler,
} from './api/error-handler';

export {
  // HTTP Client
  type HttpMethod,
  type RequestConfig,
  type HttpResponse,
  type RequestInterceptor,
  type ResponseInterceptor,
  type ErrorInterceptor,
  type HttpClientConfig,
  HttpClient,
  createHttpClient,
  httpClient,
} from './api/http-client';

// Tenancy module exports
export {
  // Tenant Context
  type Tenant,
  TenantStatus,
  type TenantSettings,
  type TenantLimits,
  type TenantBranding,
  type TenantContextData,
  tenantContextStore,
  getCurrentTenant,
  getCurrentTenantId,
  hasFeature,
  getTenantSetting,
  tenantContext,
} from './tenancy/tenant-context';

export {
  // Tenant Resolver
  ResolutionSource,
  type ResolverConfig,
  type TenantLookup,
  type RequestContext,
  type ResolutionResult,
  TenantResolver,
  createTenantResolver,
  createMockTenant,
  tenantResolver,
} from './tenancy/tenant-resolver';

export {
  // Multi-tenant Helpers
  TenantScopeError,
  assertTenantContext,
  assertTenantScope,
  assertStoreScope,
  belongsToCurrentTenant,
  belongsToCurrentStore,
  filterByTenant,
  filterByStore,
  withTenantId,
  withStoreId,
  withTenantContext,
  isTenantActive,
  assertTenantActive,
  withTenant,
  withTenantAsync,
  createTenantScopedFn,
  multiTenantHelpers,
} from './tenancy/multi-tenant-helpers';

// Utils module exports
export {
  // Validation
  type ValidationResult,
  isNonEmptyString,
  isValidEmail,
  isValidUuid,
  isValidUrl,
  isValidPhone,
  isInRange,
  hasMinLength,
  hasMaxLength,
  matchesPattern,
  sanitizeString,
  toSlug,
  validateObject,
  isDefined,
  isNonEmptyArray,
  isPositiveNumber,
  isNonNegativeNumber,
  isInteger,
  validation,
} from './utils/validation';

export {
  // Dates
  type DateFormatOptions,
  now,
  nowSeconds,
  nowIso,
  parseDate,
  toIsoString,
  formatDate,
  formatRelative,
  addDays,
  addHours,
  addMinutes,
  addSeconds,
  startOfDay,
  endOfDay,
  isPast,
  isFuture,
  isSameDay,
  diffInDays,
  diffInHours,
  diffInMinutes,
  dates,
} from './utils/dates';

export {
  // Math
  round,
  clamp,
  percentage,
  percentageRounded,
  lerp,
  sum,
  average,
  median,
  mode,
  min,
  max,
  range,
  variance,
  standardDeviation,
  randomInt,
  randomFloat,
  isBetween,
  formatCurrency,
  formatNumber,
  minorToMajor,
  majorToMinor,
  math,
} from './utils/math';
