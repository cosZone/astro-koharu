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
 * @param urlTemplate - URL template with placeholders: {path}, {relativePath}, {line}, {column}
 * @param filePath - Absolute path to the file
 * @param relativePath - Relative path from content directory (e.g., 'note/theme.md')
 * @param line - Line number to jump to (default: 1)
 * @param column - Column number (default: 1)
 * @returns The constructed editor URL
 *
 * @example
 * buildEditorUrl('vscode://file{path}:{line}', '/Users/me/project/file.md', 'note/file.md', 10)
 * // Returns: 'vscode://file/Users/me/project/file.md:10'
 *
 * @example
 * buildEditorUrl('obsidian://open?file={relativePath}', '/Users/me/project/file.md', 'note/file.md')
 * // Returns: 'obsidian://open?file=note/file.md'
 */
export function buildEditorUrl(urlTemplate: string, filePath: string, relativePath: string, line = 1, column = 1): string {
  return urlTemplate
    .replace('{path}', filePath)
    .replace('{relativePath}', relativePath)
    .replace('{line}', String(line))
    .replace('{column}', String(column));
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
 * Open a file in the specified editor
 *
 * @param editor - Editor configuration
 * @param filePath - Absolute path to the file
 * @param relativePath - Relative path from content directory
 * @param line - Line number to jump to (default: 1)
 */
export function openInEditor(editor: EditorConfig, filePath: string, relativePath: string, line = 1): void {
  const url = buildEditorUrl(editor.urlTemplate, filePath, relativePath, line);
  window.location.href = url;
}
