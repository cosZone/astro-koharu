/**
 * CMS Configuration Types
 *
 * Types for the backend-less CMS system that enables local editor integration
 * via URL protocols (vscode://, cursor://, zed://, etc.)
 */

/**
 * Configuration for a single editor
 */
export interface EditorConfig {
  /** Unique identifier for the editor */
  id: string;
  /** Display name */
  name: string;
  /** Iconify icon identifier (e.g., 'ri:vscode-line') */
  icon: string;
  /** URL template with placeholders: {path}, {line}, {column} */
  urlTemplate: string;
}

/**
 * CMS configuration from site.yaml
 */
export interface CMSConfig {
  /** Whether CMS features are enabled (dev only) */
  enabled: boolean;
  /** Absolute path to the local project directory */
  localProjectPath: string;
  /** Relative path from project root to content directory (default: 'src/content/blog') */
  contentRelativePath: string;
  /** List of configured editors */
  editors: EditorConfig[];
}
