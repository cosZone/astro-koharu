/**
 * Unified Date Formatting Utilities
 *
 * Provides consistent date formatting across the site using the configured timezone.
 * All date display should use these utilities to ensure consistent timezone handling.
 */

import { siteTimezone } from '@constants/site-config';
import { formatInTimeZone, fromZonedTime, toDate } from 'date-fns-tz';

/**
 * Standard date formats used across the site
 * @internal Used internally by displayDate functions
 */
const DateFormats = {
  /** Full datetime: 2025-01-03 12:30:45 */
  FULL: 'yyyy-MM-dd HH:mm:ss',
  /** Datetime without seconds: 2025-01-03 12:30 */
  DATETIME: 'yyyy-MM-dd HH:mm',
  /** Date only: 2025-01-03 */
  DATE: 'yyyy-MM-dd',
  /** Short date: 25-01-03 */
  SHORT_DATE: 'yy-MM-dd',
  /** Month and day: 01/03 */
  MONTH_DAY: 'MM/dd',
} as const;

/**
 * Format a date using the site's configured timezone
 * @internal Used by displayDate and formatForSeo
 */
function formatDate(date: Date | string, formatStr: string = DateFormats.DATE, timezone: string = siteTimezone): string {
  if (date == null) {
    throw new Error('Date parameter is required and cannot be null or undefined');
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Validate that the date is valid
  if (Number.isNaN(dateObj.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }

  return formatInTimeZone(dateObj, timezone, formatStr);
}

/**
 * Convenience functions for common date display formats
 * All functions use the site's configured timezone
 */
export const displayDate = {
  /** Format as yyyy-MM-dd */
  date: (d: Date | string) => formatDate(d, DateFormats.DATE),

  /** Format as yyyy-MM-dd HH:mm */
  datetime: (d: Date | string) => formatDate(d, DateFormats.DATETIME),

  /** Format as yy-MM-dd */
  shortDate: (d: Date | string) => formatDate(d, DateFormats.SHORT_DATE),

  /** Format as MM/dd */
  monthDay: (d: Date | string) => formatDate(d, DateFormats.MONTH_DAY),

  /** Format as yyyy-MM-dd HH:mm:ss */
  full: (d: Date | string) => formatDate(d, DateFormats.FULL),
} as const;

/**
 * Format date for SEO/Schema.org (ISO date format)
 *
 * @param date - Date object or date string
 * @returns Date in yyyy-MM-dd format for SEO
 */
export function formatForSeo(date: Date | string): string {
  return formatDate(date, DateFormats.DATE);
}

/**
 * Parse a date string assuming it's in the site's configured timezone.
 * Ensures consistent parsing regardless of build environment.
 *
 * This solves the issue where `new Date("2025-12-29 21:55:00")` produces
 * different results depending on the system timezone of the build server.
 *
 * @param dateString - Date string to parse (e.g., "2025-12-29 21:55:00")
 * @returns Date object representing the correct moment in time
 * @throws {Error} If dateString is empty or results in invalid date
 */
export function parseDateInSiteTimezone(dateString: string): Date {
  if (!dateString || !dateString.trim()) {
    throw new Error('Date string cannot be empty');
  }

  // toDate will parse strings without timezone offset as if they were in the specified timezone
  const result = toDate(dateString, { timeZone: siteTimezone });

  // Validate the parsed date
  if (Number.isNaN(result.getTime())) {
    throw new Error(`Failed to parse date string: ${dateString}`);
  }

  return result;
}

/**
 * Reinterpret a Date object that was incorrectly parsed as UTC.
 *
 * gray-matter (used by Astro to parse frontmatter) automatically parses YAML dates
 * like "2025-12-29 21:55:00" as UTC, creating Date(2025-12-29T21:55:00.000Z).
 * However, the user intended this to be in the site timezone.
 *
 * This function extracts the UTC time values and reinterprets them as site timezone,
 * producing the correct UTC timestamp.
 *
 * Example:
 * - Input: Date(2025-12-29T21:55:00.000Z) ← gray-matter's incorrect UTC parse
 * - Output: Date(2025-12-29T13:55:00.000Z) ← correct UTC for Asia/Shanghai 21:55
 *
 * @param date - Date object incorrectly parsed as UTC by gray-matter
 * @returns Date object with correct UTC timestamp
 */
export function reinterpretUtcAsTimezone(date: Date): Date {
  // Extract the "wrong" UTC time as a string (e.g., "2025-12-29 21:55:00")
  const dateStr = formatInTimeZone(date, 'UTC', 'yyyy-MM-dd HH:mm:ss');
  // Re-parse this string as if it were in the site timezone
  return fromZonedTime(dateStr, siteTimezone);
}
