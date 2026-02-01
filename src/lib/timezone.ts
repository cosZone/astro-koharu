/**
 * Timezone Utilities
 *
 * Low-level timezone validation and constants.
 * Separated to avoid circular dependencies between site-config and date modules.
 */

/** Default timezone used when configuration is invalid or missing */
export const DEFAULT_TIMEZONE = 'Asia/Shanghai';

/**
 * Validate if a string is a valid IANA timezone identifier
 *
 * @param timezone - Timezone string to validate (e.g., "Asia/Shanghai", "UTC")
 * @returns true if valid IANA timezone, false otherwise
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
