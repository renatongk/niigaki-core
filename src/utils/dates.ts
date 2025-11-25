/**
 * Date Utilities Module
 * Common date manipulation and formatting functions.
 */

/**
 * Date format options
 */
export interface DateFormatOptions {
  locale?: string;
  timeZone?: string;
  includeTime?: boolean;
  includeSeconds?: boolean;
}

/**
 * Get current timestamp in milliseconds
 */
export function now(): number {
  return Date.now();
}

/**
 * Get current timestamp in seconds (Unix timestamp)
 */
export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Get current date as ISO string
 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Parse a date from various formats
 */
export function parseDate(value: string | number | Date): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'number') {
    // Assume Unix timestamp in seconds if small enough
    if (value < 1e12) {
      return new Date(value * 1000);
    }
    return new Date(value);
  }
  return new Date(value);
}

/**
 * Format a date to ISO string
 */
export function toIsoString(date: Date | string | number): string {
  return parseDate(date).toISOString();
}

/**
 * Format a date to a localized string
 */
export function formatDate(
  date: Date | string | number,
  options: DateFormatOptions = {}
): string {
  const d = parseDate(date);
  const locale = options.locale ?? 'en-US';

  const formatOptions: Intl.DateTimeFormatOptions = {
    timeZone: options.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  if (options.includeTime) {
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
    if (options.includeSeconds) {
      formatOptions.second = '2-digit';
    }
  }

  return new Intl.DateTimeFormat(locale, formatOptions).format(d);
}

/**
 * Format a date relative to now (e.g., "2 hours ago")
 */
export function formatRelative(date: Date | string | number): string {
  const d = parseDate(date);
  const nowMs = Date.now();
  const diffMs = nowMs - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) {
    return 'just now';
  }
  if (diffMin < 60) {
    return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  }
  if (diffHour < 24) {
    return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  }
  if (diffDay < 7) {
    return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  }
  if (diffWeek < 4) {
    return `${diffWeek} week${diffWeek === 1 ? '' : 's'} ago`;
  }
  if (diffMonth < 12) {
    return `${diffMonth} month${diffMonth === 1 ? '' : 's'} ago`;
  }
  return `${diffYear} year${diffYear === 1 ? '' : 's'} ago`;
}

/**
 * Add days to a date
 */
export function addDays(date: Date | string | number, days: number): Date {
  const d = parseDate(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Add hours to a date
 */
export function addHours(date: Date | string | number, hours: number): Date {
  const d = parseDate(date);
  d.setHours(d.getHours() + hours);
  return d;
}

/**
 * Add minutes to a date
 */
export function addMinutes(date: Date | string | number, minutes: number): Date {
  const d = parseDate(date);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

/**
 * Add seconds to a date
 */
export function addSeconds(date: Date | string | number, seconds: number): Date {
  const d = parseDate(date);
  d.setSeconds(d.getSeconds() + seconds);
  return d;
}

/**
 * Get start of day
 */
export function startOfDay(date: Date | string | number): Date {
  const d = parseDate(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day
 */
export function endOfDay(date: Date | string | number): Date {
  const d = parseDate(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date | string | number): boolean {
  return parseDate(date).getTime() < Date.now();
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: Date | string | number): boolean {
  return parseDate(date).getTime() > Date.now();
}

/**
 * Check if two dates are on the same day
 */
export function isSameDay(
  date1: Date | string | number,
  date2: Date | string | number
): boolean {
  const d1 = startOfDay(date1);
  const d2 = startOfDay(date2);
  return d1.getTime() === d2.getTime();
}

/**
 * Get difference between two dates in days
 */
export function diffInDays(
  date1: Date | string | number,
  date2: Date | string | number
): number {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  const diffMs = Math.abs(d1.getTime() - d2.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get difference between two dates in hours
 */
export function diffInHours(
  date1: Date | string | number,
  date2: Date | string | number
): number {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  const diffMs = Math.abs(d1.getTime() - d2.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60));
}

/**
 * Get difference between two dates in minutes
 */
export function diffInMinutes(
  date1: Date | string | number,
  date2: Date | string | number
): number {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  const diffMs = Math.abs(d1.getTime() - d2.getTime());
  return Math.floor(diffMs / (1000 * 60));
}

/**
 * Date utilities module export
 */
export const dates = {
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
};
