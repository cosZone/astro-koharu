/**
 * Announcement System Types
 *
 * Types for the backend-less site announcement system.
 * Supports time-based visibility control and priority ordering.
 */

export interface Announcement {
  /** Unique identifier for the announcement */
  id: string;

  /** Title of the announcement */
  title: string;

  /** Main content (plain text) */
  content: string;

  /** Announcement type for styling */
  type?: 'info' | 'warning' | 'success' | 'important';

  /** Publish date for display (ISO 8601 string). Defaults to startDate if not set */
  publishDate?: string;

  /** Start date (ISO 8601 string). If omitted, effective immediately */
  startDate?: string;

  /** End date (ISO 8601 string). If omitted, never expires */
  endDate?: string;

  /** Priority (higher = shown first). Default: 0 */
  priority?: number;

  /** Optional link for "Learn more" action */
  link?: {
    url: string;
    text?: string;
    external?: boolean;
  };

  /** Custom color (CSS color value, e.g., '#FF6B6B'). Overrides type color */
  color?: string;
}
