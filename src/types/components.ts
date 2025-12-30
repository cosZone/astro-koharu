/**
 * Component Props Interfaces
 *
 * This file contains all component prop interfaces for type safety and reusability.
 */

import type { BlogPost } from './blog';
import type { ControlledComponentProps, OptionType, WithClassName } from './ui';

/**
 * PostItemCard component props
 */
export interface PostItemCardProps {
  /** Blog post data */
  data: BlogPost;
  /** Whether to use left clip path (default: true) */
  leftClip?: boolean;
  /** Random cover image URL */
  randomCover: string;
}

/**
 * Segmented control component props
 */
export interface SegmentedProps<T extends string | number = string | number>
  extends ControlledComponentProps<T>,
    WithClassName {
  /** Segmented options */
  options: OptionType<T>[];
  /** Custom class for indicator */
  indicateClass?: string;
  /** Custom class for each item */
  itemClass?: string;
  /** Unique ID for motion layoutId */
  id?: string;
}

/**
 * DropdownNav component props
 */
export interface DropdownNavProps extends WithClassName {
  /** Navigation items */
  items: Array<{
    label: string;
    href: string;
    icon?: string;
  }>;
  /** Dropdown trigger element */
  trigger: React.ReactNode;
  /** Open state (controlled) */
  open?: boolean;
  /** Default open state (uncontrolled) */
  defaultOpen?: boolean;
  /** Change handler */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Popover component props
 */
export interface PopoverProps extends WithClassName {
  /** Trigger element */
  trigger: React.ReactNode;
  /** Popover content */
  content: React.ReactNode;
  /** Open state (controlled) */
  open?: boolean;
  /** Default open state (uncontrolled) */
  defaultOpen?: boolean;
  /** Change handler */
  onOpenChange?: (open: boolean) => void;
  /** Placement */
  placement?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Tooltip component props
 */
export interface TooltipProps extends WithClassName {
  /** Tooltip content */
  content: React.ReactNode;
  /** Child element that triggers tooltip */
  children: React.ReactNode;
  /** Placement */
  placement?: 'top' | 'right' | 'bottom' | 'left';
  /** Delay before showing (ms) */
  delay?: number;
}

/**
 * MenuIcon component props
 */
export interface MenuIconProps extends WithClassName {
  /** Open state (controlled) */
  open?: boolean;
  /** Default open state (uncontrolled) */
  defaultOpen?: boolean;
  /** Change handler */
  onOpenChange?: (open: boolean) => void;
}

/**
 * TableOfContents component props
 */
export interface TableOfContentsProps extends WithClassName {
  /** Article headings */
  headings: Array<{
    depth: number;
    text: string;
    slug: string;
  }>;
  /** Whether to show numbering */
  numbered?: boolean;
  /** Active heading slug */
  activeId?: string;
}

/**
 * NavItem component props
 */
export interface NavItemProps extends WithClassName {
  /** Navigation label */
  label: string;
  /** Navigation href */
  href: string;
  /** Icon name */
  icon?: string;
  /** Whether item is active */
  active?: boolean;
  /** Click handler */
  onClick?: () => void;
}

/**
 * ErrorBoundary component props
 */
export interface ErrorBoundaryProps {
  /** Children to wrap */
  children: React.ReactNode;
  /** Fallback UI on error */
  fallback?: React.ReactNode;
  /** Error handler callback */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Cover component props
 */
export interface CoverProps extends WithClassName {
  /** Cover image URL */
  src: string;
  /** Alt text */
  alt?: string;
  /** Whether to show wave effect */
  wave?: boolean;
}
