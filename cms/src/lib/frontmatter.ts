/**
 * Frontmatter serialization utilities
 *
 * Shared utilities for serializing frontmatter data to ensure consistent
 * YAML formatting across all CMS operations.
 */
import { format } from 'date-fns';

/**
 * Converts frontmatter dates to YAML-friendly strings
 * Uses YYYY-MM-DD HH:mm:ss format to match existing blog post format
 *
 * This function ensures that Date objects are serialized consistently,
 * preserving the original format used in blog posts rather than ISO 8601.
 */
export function serializeFrontmatter(frontmatter: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(frontmatter)) {
    if (value instanceof Date) {
      // Format date as YYYY-MM-DD HH:mm:ss to match existing format
      result[key] = format(value, 'yyyy-MM-dd HH:mm:ss');
    } else if (value !== undefined && value !== null) {
      result[key] = value;
    }
  }

  return result;
}
