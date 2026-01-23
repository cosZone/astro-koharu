/**
 * CMS Editor URL Generation
 *
 * Utilities for generating editor URLs that open local files
 * via custom URL protocols (vscode://, cursor://, zed://, etc.)
 */

import type { EditorConfig } from '@/types/cms';

/**
 * Build an editor URL from a template and file path
 *
 * @param urlTemplate - URL template with placeholders: {path}, {line}, {column}
 * @param filePath - Absolute path to the file
 * @param line - Line number to jump to (default: 1)
 * @param column - Column number (default: 1)
 * @returns The constructed editor URL
 *
 * @example
 * buildEditorUrl('vscode://file{path}:{line}', '/Users/me/project/file.md', 10)
 * // Returns: 'vscode://file/Users/me/project/file.md:10'
 */
export function buildEditorUrl(urlTemplate: string, filePath: string, line = 1, column = 1): string {
  return urlTemplate.replace('{path}', filePath).replace('{line}', String(line)).replace('{column}', String(column));
}

/**
 * Get the full file path for a post
 *
 * @param localProjectPath - Absolute path to the project directory
 * @param contentRelativePath - Relative path to content directory (e.g., 'src/content/blog')
 * @param postId - Post ID from Astro Content Collections (e.g., 'note/front-end/theme.md')
 * @returns Absolute path to the post file
 *
 * @example
 * getFullFilePath('/Users/me/astro-koharu', 'src/content/blog', 'note/theme.md')
 * // Returns: '/Users/me/astro-koharu/src/content/blog/note/theme.md'
 */
export function getFullFilePath(localProjectPath: string, contentRelativePath: string, postId: string): string {
  // Normalize paths to avoid double slashes
  const normalizedProjectPath = localProjectPath.replace(/\/+$/, '');
  const normalizedContentPath = contentRelativePath.replace(/^\/+|\/+$/g, '');
  const normalizedPostId = postId.replace(/^\/+/, '');

  return `${normalizedProjectPath}/${normalizedContentPath}/${normalizedPostId}`;
}

/**
 * Find the default editor from a list of editors
 *
 * @param editors - List of editor configurations
 * @returns The default editor, or the first editor if none is marked as default
 */
export function getDefaultEditor(editors: EditorConfig[]): EditorConfig | null {
  if (editors.length === 0) return null;
  return editors.find((e) => e.default) ?? editors[0];
}

/**
 * Open a file in the specified editor
 *
 * @param editor - Editor configuration
 * @param filePath - Absolute path to the file
 * @param line - Line number to jump to (default: 1)
 */
export function openInEditor(editor: EditorConfig, filePath: string, line = 1): void {
  const url = buildEditorUrl(editor.urlTemplate, filePath, line);
  window.location.href = url;
}
