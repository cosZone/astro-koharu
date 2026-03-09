/**
 * Content utilities - Index file
 *
 * Re-exports all content-related utilities from modular files.
 * This maintains backward compatibility while organizing code better.
 */

// =============================================================================
// Category Utilities
// =============================================================================
export {
  addCategoryRecursively,
  buildCategoryPath,
  getCategoryArr,
  getCategoryByLink,
  getCategoryLinks,
  getCategoryList,
  getCategoryNameByLink,
  getParentCategory,
  translateCategoryName,
  translateSeriesField,
} from './content/categories';

// =============================================================================
// Locale Utilities
// =============================================================================
export { getPostLocale, getPostSlug } from './content/locale';
// =============================================================================
// Post Utilities
// =============================================================================
export {
  // Core post functions
  getAdjacentSeriesPosts,
  // Featured series functions
  getEnabledSeries,
  getFeaturedCategoryNames,
  getHomeHighlightedPosts,
  getHomePagePosts,
  getNonFeaturedPosts,
  getNonFeaturedPostsBySticky,
  getPostById,
  getPostCount,
  getPostDescription,
  getPostDescriptionWithSummary,
  getPostLastCategory,
  // Reading time utility
  getPostReadingTime,
  getPostSummary,
  getPostsByCategory,
  getPostsBySeriesSlug,
  getPostsBySticky,
  getRandomPosts,
  getSeriesBySlug,
  getSeriesPosts,
  getSortedPosts,
} from './content/posts';

// =============================================================================
// Tag Utilities
// =============================================================================
export { buildTagPath, getAllTags, normalizeTag, tagToSlug } from './content/tags';

// =============================================================================
// Types
// =============================================================================
export type { Category, CategoryListResult } from './content/types';
