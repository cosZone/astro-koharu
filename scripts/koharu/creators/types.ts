import type { FC } from 'react';

/**
 * Props passed to content creator components
 */
export interface CreatorProps {
  /** Callback when creation is complete */
  onComplete: (success: boolean) => void;
  /** Whether to show return hint (for menu navigation) */
  showReturnHint?: boolean;
}

/**
 * Content creator definition
 */
export interface ContentCreator {
  /** Unique identifier for the creator */
  id: string;
  /** Display label shown in menu */
  label: string;
  /** Short description of what this creator does */
  description: string;
  /** The React component that renders the creator UI */
  Component: FC<CreatorProps>;
}

/**
 * Category tree item for display
 */
export interface CategoryTreeItem {
  /** Category name (Chinese) */
  name: string;
  /** URL-friendly slug */
  slug: string;
  /** Full path for nested categories */
  path: string[];
  /** Indentation level for display */
  level: number;
  /** Children categories */
  children?: CategoryTreeItem[];
}

/**
 * Post frontmatter data
 */
export interface PostData {
  title: string;
  link?: string;
  description?: string;
  categories: string | string[];
  tags: string[];
  draft: boolean;
}

/**
 * Friend link data
 */
export interface FriendData {
  site: string;
  url: string;
  owner: string;
  desc: string;
  image: string;
  color?: string;
}
