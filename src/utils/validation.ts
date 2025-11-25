/**
 * Validation Utilities Module
 * Common validation functions for input sanitization and verification.
 */

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Check if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if a value is a valid email address
 */
export function isValidEmail(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Check if a value is a valid UUID
 */
export function isValidUuid(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Check if a value is a valid URL
 */
export function isValidUrl(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a value is a valid phone number (basic check)
 */
export function isValidPhone(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  // Basic phone validation: allows digits, spaces, dashes, parentheses, plus
  const phoneRegex = /^[\d\s\-+()]{10,20}$/;
  return phoneRegex.test(value);
}

/**
 * Check if a value is within a numeric range
 */
export function isInRange(
  value: number,
  min: number,
  max: number
): boolean {
  return value >= min && value <= max;
}

/**
 * Check if a string matches a minimum length
 */
export function hasMinLength(value: string, minLength: number): boolean {
  return value.length >= minLength;
}

/**
 * Check if a string matches a maximum length
 */
export function hasMaxLength(value: string, maxLength: number): boolean {
  return value.length <= maxLength;
}

/**
 * Check if a string matches a regex pattern
 */
export function matchesPattern(value: string, pattern: RegExp): boolean {
  return pattern.test(value);
}

/**
 * Sanitize a string by trimming whitespace
 */
export function sanitizeString(value: string): string {
  return value.trim();
}

/**
 * Sanitize a string for use as a slug
 */
export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Validate an object against a schema of validators
 */
export function validateObject(
  obj: Record<string, unknown>,
  schema: Record<string, (value: unknown) => boolean>
): ValidationResult {
  const errors: string[] = [];

  for (const [field, validator] of Object.entries(schema)) {
    const value = obj[field];
    if (!validator(value)) {
      errors.push(`Invalid value for field: ${field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if an array is non-empty
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Check if a value is a positive number
 */
export function isPositiveNumber(value: unknown): boolean {
  return typeof value === 'number' && !isNaN(value) && value > 0;
}

/**
 * Check if a value is a non-negative number
 */
export function isNonNegativeNumber(value: unknown): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= 0;
}

/**
 * Check if a value is an integer
 */
export function isInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value);
}

/**
 * Validation utilities module export
 */
export const validation = {
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
};
