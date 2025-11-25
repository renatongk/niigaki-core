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
 * - Billing management (ASAAS integration)
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

// Billing module exports
export {
  // Billing Status
  BillingStatus,
  isBillingStatus,
  isValidTransition,
  hasFullAccess,
  hasLimitedAccess,
  hasAnyAccess,
  billingStatusTransitions,
  billingStatus,
} from './billing/types/billing-status';

export {
  // Billing Plan
  BillingCycle,
  type BillingPlan,
  type SubscriptionMetadata,
  isBillingCycle,
  getBillingCycleDays,
  createDefaultSubscriptionMetadata,
  billingPlan,
} from './billing/types/billing-plan';

export {
  // ASAAS Events
  AsaasEventType,
  AsaasPaymentStatus,
  AsaasSubscriptionStatus,
  type AsaasWebhookEvent,
  type AsaasPaymentPayload,
  type AsaasSubscriptionPayload,
  isAsaasEventType,
  isPaymentEvent,
  isSubscriptionEvent,
  requiredAsaasEvents,
  asaasEvents,
} from './billing/types/asaas-events';

export {
  // Customer DTOs
  type CreateCustomerDto,
  type UpdateCustomerDto,
  type AsaasCustomerResponse,
  validateCreateCustomerDto,
  customerDto,
} from './billing/dtos/customer.dto';

export {
  // Subscription DTOs
  type AsaasBillingType,
  type AsaasDiscountType,
  type AsaasFineType,
  type CreateSubscriptionDto,
  type UpdateSubscriptionDto,
  type AsaasSubscriptionResponse,
  validateCreateSubscriptionDto,
  subscriptionDto,
} from './billing/dtos/subscription.dto';

export {
  // Invoice DTOs
  type ListInvoicesDto,
  type AsaasInvoiceResponse,
  type AsaasPaginatedResponse,
  type Invoice,
  toInvoice,
  invoiceDto,
} from './billing/dtos/invoice.dto';

export {
  // Billing Errors
  BillingErrorCode,
  BillingError,
  SubscriptionCreationError,
  SubscriptionCancellationError,
  CustomerCreationError,
  PaymentOverdueError,
  WebhookInvalidError,
  BillingStatusInvalidError,
  AsaasApiError,
  InvalidBillingTransitionError,
  isBillingError,
  billingErrors,
} from './billing/billing-errors';

export {
  // ASAAS Client
  type AsaasEnvironment,
  type AsaasClientConfig,
  AsaasClient,
  createAsaasClient,
  ASAAS_BASE_URLS,
  asaasClient,
} from './billing/asaas-client';

export {
  // Subscription Service
  type TenantBillingData,
  type UpdateTenantBillingCallback,
  type GetTenantBillingCallback,
  type SubscriptionServiceConfig,
  type InitializeSubscriptionOptions,
  type InitializeSubscriptionResult,
  SubscriptionService,
  createSubscriptionService,
  subscriptionService,
} from './billing/subscription-service';

export {
  // Billing Service
  type BillableTenant,
  type BillingServiceConfig,
  type CreateCustomerResult,
  BillingService,
  createBillingService,
  billingService,
} from './billing/billing-service';

export {
  // Webhook Handler
  type WebhookHandlerConfig,
  type WebhookProcessingResult,
  WebhookHandler,
  createWebhookHandler,
  webhookHandler,
} from './billing/webhook-handler';

export {
  // Billing Enforcer
  type BillingContext,
  type BillingEnforcerConfig,
  BillingEnforcer,
  createBillingEnforcer,
  billingEnforcer,
} from './billing/billing-enforcer';
