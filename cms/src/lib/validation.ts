/**
 * CMS Path Validation Utilities
 *
 * Security utilities for validating file paths in CMS operations.
 */

import path from 'node:path';

/**
 * Validates that the requested path is safe and within bounds
 * Prevents path traversal attacks
 *
 * @param filePath - The file path to validate (relative path)
 * @returns true if the path is safe, false otherwise
 */
export function isPathSafe(filePath: string): boolean {
  const normalized = path.normalize(filePath);
  return !normalized.includes('..') && !path.isAbsolute(normalized);
}

/**
 * Validates that a file path has a valid markdown extension
 *
 * @param filePath - The file path to validate
 * @returns true if the file has .md or .mdx extension
 */
export function hasValidMarkdownExtension(filePath: string): boolean {
  const ext = path.extname(filePath);
  return ext === '.md' || ext === '.mdx';
}
