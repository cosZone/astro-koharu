/**
 * Unified layout spacing constants
 *
 * This file defines standardized spacing values for consistent horizontal
 * and vertical spacing across all pages and components.
 */

/**
 * Content area padding for main content blocks
 */
export const CONTENT_PADDING = {
  // Standard content with top spacing
  standard: 'px-10 py-8 tablet:px-6 tablet:pt-6 tablet:pb-2',
  // Content without extra top spacing
  normal: 'px-6 py-4 tablet:px-6',
  // Compact content (for nested items)
  compact: 'px-4 py-2 tablet:px-2 tablet:py-1',
} as const;

/**
 * Max width constraints
 */
export const MAX_WIDTH = {
  // Main content container (1400px)
  content: 'max-w-7xl',
} as const;

/**
 * Pagination settings
 */
export const PAGINATION = {
  // Posts per page for homepage and post listing
  pageSize: 10,
} as const;
