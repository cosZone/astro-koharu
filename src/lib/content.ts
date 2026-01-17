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
} from './content/categories';

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
  // Deprecated (kept for backwards compatibility)
  /** @deprecated Use getHomeHighlightedPosts() instead */
  getLatestWeeklyPost,
  getNonFeaturedPosts,
  getNonFeaturedPostsBySticky,
  /** @deprecated Use getNonFeaturedPosts() instead */
  getNonWeeklyPosts,
  /** @deprecated Use getNonFeaturedPostsBySticky() instead */
  getNonWeeklyPostsBySticky,
  getPostCount,
  getPostDescription,
  getPostDescriptionWithSummary,
  getPostLastCategory,
  getPostSummary,
  getPostsByCategory,
  getPostsBySeriesSlug,
  getPostsBySticky,
  getRandomPosts,
  getSeriesBySlug,
  getSeriesPosts,
  getSortedPosts,
  /** @deprecated Use getPostsBySeriesSlug('weekly') instead */
  getWeeklyPosts,
} from './content/posts';

// =============================================================================
// Tag Utilities
// =============================================================================
export { getAllTags, normalizeTag } from './content/tags';

// =============================================================================
// Types
// =============================================================================
export type { Category, CategoryListResult } from './content/types';
