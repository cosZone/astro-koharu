/**
 * Editor URL Utilities
 *
 * Utilities for building URLs to open files in local editors.
 */

import { CONTENT_DIR } from './paths';

export interface EditorConfig {
  id: string;
  name: string;
  icon: string;
  urlTemplate: string;
}

/** Default editor configurations */
export const DEFAULT_EDITORS: EditorConfig[] = [
  {
    id: 'vscode',
    name: 'VS Code',
    icon: 'ri:vscode-line',
    urlTemplate: 'vscode://file/{path}:{line}:{column}',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    icon: 'ri:cursor-line',
    urlTemplate: 'cursor://file/{path}:{line}:{column}',
  },
  {
    id: 'zed',
    name: 'Zed',
    icon: 'ri:terminal-box-line',
    urlTemplate: 'zed://file/{path}:{line}:{column}',
  },
];

/**
 * Builds the full file path for a post
 */
export function buildFilePath(projectRoot: string, postId: string): string {
  return `${projectRoot}/${CONTENT_DIR}/${postId}`;
}

/**
 * Builds a URL to open a file in a local editor
 *
 * @param editor - The editor configuration
 * @param filePath - Full path to the file
 * @param line - Line number (default: 1)
 * @param column - Column number (default: 1)
 * @returns The editor URL
 *
 * @example
 * buildEditorUrl(DEFAULT_EDITORS[0], '/path/to/file.md')
 * // 'vscode://file//path/to/file.md:1:1'
 */
export function buildEditorUrl(editor: EditorConfig, filePath: string, line = 1, column = 1): string {
  return editor.urlTemplate.replace('{path}', filePath).replace('{line}', String(line)).replace('{column}', String(column));
}

/** Default editor (VS Code) - used as fallback */
const VSCODE_EDITOR: EditorConfig = {
  id: 'vscode',
  name: 'VS Code',
  icon: 'ri:vscode-line',
  urlTemplate: 'vscode://file/{path}:{line}:{column}',
};

/**
 * Gets the default editor (VS Code)
 */
export function getDefaultEditor(): EditorConfig {
  return DEFAULT_EDITORS[0] ?? VSCODE_EDITOR;
}
