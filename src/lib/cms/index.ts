/**
 * CMS Module
 *
 * Backend-less CMS system that enables local editor integration
 * via URL protocols (vscode://, cursor://, zed://, etc.)
 */

export type { ReadPostResult } from './api';

// Browser editor API
export { readPost, writePost } from './api';
// Category utilities
export { detectNewCategories, extractCategoryNames, generateCategorySlug } from './category';
export { buildEditorUrl, getFullFilePath, openInEditor } from './editor-url';
