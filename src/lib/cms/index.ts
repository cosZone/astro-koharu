/**
 * CMS Module
 *
 * Backend-less CMS system that enables local editor integration
 * via URL protocols (vscode://, cursor://, zed://, etc.)
 */

// Slug generation
export { generateSlug } from '@lib/slug';
// Types
export type {
  CreatePostParams,
  CreatePostResponse,
  DashboardStats,
  ListPostsParams,
  ListPostsResponse,
  PostListItem,
  ReadPostResult,
  ToggleDraftResponse,
} from './api';
// Browser editor API
export { createPost, listPosts, readPost, toggleDraft, writePost } from './api';
// Category utilities
export { detectNewCategories, extractCategoryNames, generateCategorySlug } from './category';
export { buildEditorUrl, getFullFilePath, openInEditor } from './editor-url';
// API Guard (server-side only)
export { jsonErrorResponse, jsonResponse, validateCmsAccess } from './guard';
// Form schemas
export {
  type CategoryMappingFormData,
  type CreatePostFormData,
  categoryMappingSchema,
  categorySlugSchema,
  createPostSchema,
  type FrontmatterFormData,
  frontmatterSchema,
} from './schemas';
// Validation utilities
export { hasValidMarkdownExtension, isPathSafe } from './validation';
