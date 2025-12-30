/**
 * Content utilities - Index file
 *
 * Re-exports all content-related utilities from modular files.
 * This maintains backward compatibility while organizing code better.
 */

// Export category utilities
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
// Export post utilities
export {
  getAdjacentSeriesPosts,
  // Weekly/Featured series utilities
  getLatestWeeklyPost,
  getNonWeeklyPosts,
  getNonWeeklyPostsBySticky,
  getPostCount,
  getPostDescription,
  getPostDescriptionWithSummary,
  getPostLastCategory,
  getPostSummary,
  getPostsByCategory,
  getPostsBySticky,
  getRandomPosts,
  getSeriesPosts,
  getSortedPosts,
  getWeeklyPosts,
} from './content/posts';
// Export tag utilities
export { getAllTags, normalizeTag } from './content/tags';
// Export types
export type { Category, CategoryListResult } from './content/types';
