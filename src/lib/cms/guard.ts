/**
 * CMS API Guard
 *
 * Shared security validation for CMS API endpoints.
 * Checks development mode and CMS enabled status.
 */

import { cmsConfig } from '@constants/site-config';

export interface CmsGuardError {
  error: string;
  status: 403;
}

/**
 * Validates that CMS API access is allowed.
 * Returns an error object if access is denied, null if allowed.
 *
 * @example
 * const guardError = validateCmsAccess();
 * if (guardError) {
 *   return new Response(JSON.stringify({ error: guardError.error }), {
 *     status: guardError.status,
 *     headers: { 'Content-Type': 'application/json' },
 *   });
 * }
 */
export function validateCmsAccess(): CmsGuardError | null {
  // Security: Only allow in development mode
  if (!import.meta.env.DEV) {
    return {
      error: 'CMS API is only available in development mode',
      status: 403,
    };
  }

  // Security: Only allow when CMS is enabled
  if (!cmsConfig.enabled) {
    return {
      error: 'CMS is not enabled',
      status: 403,
    };
  }

  return null;
}

/**
 * Creates a JSON error response
 */
export function jsonErrorResponse(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Creates a JSON success response
 */
export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
