/**
 * Math Utilities Module
 * Common mathematical operations and calculations.
 */

/**
 * Round a number to a specific number of decimal places
 */
export function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Clamp a value between a minimum and maximum
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate percentage
 */
export function percentage(value: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return (value / total) * 100;
}

/**
 * Calculate percentage with rounding
 */
export function percentageRounded(
  value: number,
  total: number,
  decimals: number = 2
): number {
  return round(percentage(value, total), decimals);
}

/**
 * Linear interpolation between two values
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Calculate the sum of an array of numbers
 */
export function sum(values: number[]): number {
  return values.reduce((acc, val) => acc + val, 0);
}

/**
 * Calculate the average of an array of numbers
 */
export function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return sum(values) / values.length;
}

/**
 * Calculate the median of an array of numbers
 */
export function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const left = sorted[mid - 1];
    const right = sorted[mid];
    if (left !== undefined && right !== undefined) {
      return (left + right) / 2;
    }
    return 0;
  }
  return sorted[mid] ?? 0;
}

/**
 * Calculate the mode of an array of numbers
 */
export function mode(values: number[]): number[] {
  if (values.length === 0) {
    return [];
  }

  const counts = new Map<number, number>();
  let maxCount = 0;

  for (const value of values) {
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);
    if (count > maxCount) {
      maxCount = count;
    }
  }

  const modes: number[] = [];
  for (const [value, count] of counts) {
    if (count === maxCount) {
      modes.push(value);
    }
  }

  return modes;
}

/**
 * Calculate the minimum value in an array
 */
export function min(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return Math.min(...values);
}

/**
 * Calculate the maximum value in an array
 */
export function max(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return Math.max(...values);
}

/**
 * Calculate the range (max - min) of an array
 */
export function range(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return max(values) - min(values);
}

/**
 * Calculate variance of an array of numbers
 */
export function variance(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const avg = average(values);
  const squaredDiffs = values.map((v) => Math.pow(v - avg, 2));
  return sum(squaredDiffs) / values.length;
}

/**
 * Calculate standard deviation of an array of numbers
 */
export function standardDeviation(values: number[]): number {
  return Math.sqrt(variance(values));
}

/**
 * Generate a random integer between min and max (inclusive)
 */
export function randomInt(minVal: number, maxVal: number): number {
  return Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
}

/**
 * Generate a random float between min and max
 */
export function randomFloat(minVal: number, maxVal: number): number {
  return Math.random() * (maxVal - minVal) + minVal;
}

/**
 * Check if a number is between two values (inclusive)
 */
export function isBetween(
  value: number,
  minVal: number,
  maxVal: number
): boolean {
  return value >= minVal && value <= maxVal;
}

/**
 * Format a number as currency
 */
export function formatCurrency(
  value: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format a number with thousands separators
 */
export function formatNumber(value: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Convert cents to dollars (or minor to major currency unit)
 */
export function minorToMajor(cents: number, decimals: number = 2): number {
  return round(cents / 100, decimals);
}

/**
 * Convert dollars to cents (or major to minor currency unit)
 */
export function majorToMinor(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Math utilities module export
 */
export const math = {
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
};
