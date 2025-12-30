/**
 * HeadingTreeItem Component
 *
 * Renders a single heading item in the table of contents tree.
 * Supports nesting, active state highlighting, and recursive rendering of children.
 */

import type { Heading } from '@hooks/useHeadingTree';
import { memo } from 'react';
import { cn } from '@/lib/utils';

// Constants
const INDENT_BASE = 0.75; // Base left padding in rem
const INDENT_PER_LEVEL = 1; // Additional padding per nesting level in rem

interface HeadingTreeItemProps {
  /** The heading node to render */
  heading: Heading;
  /** Current nesting depth (0 for top level) */
  depth?: number;
  /** Whether this heading is currently active */
  isActive?: boolean;
  /** Whether this heading's children are expanded */
  isExpanded?: boolean;
  /** Callback when heading is clicked */
  onHeadingClick: (id: string) => void;
  /** Recursively render children if expanded */
  renderChildren?: (headings: Heading[], depth: number) => React.ReactElement[];
}

/**
 * HeadingTreeItem - A single item in the table of contents tree
 */
const HeadingTreeItemComponent = ({
  heading,
  depth = 0,
  isActive = false,
  isExpanded = false,
  onHeadingClick,
  renderChildren,
}: HeadingTreeItemProps) => {
  const hasChildren = heading.children.length > 0;

  return (
    <div key={heading.id} className="heading-tree-item relative">
      <a
        href={`#${heading.id}`}
        onClick={(e) => {
          e.preventDefault();
          onHeadingClick(heading.id);
        }}
        className={cn(
          'heading-link group relative flex items-center rounded-md py-2 text-sm transition-all duration-200 hover:border-l-2 hover:bg-foreground/5',
          {
            'border-l-primary bg-primary/10 font-medium text-primary hover:bg-primary/10 hover:text-primary': isActive,
          },
        )}
        style={{
          paddingLeft: `${INDENT_BASE + depth * INDENT_PER_LEVEL}rem`,
          paddingRight: hasChildren ? '0.5rem' : '0.75rem',
        }}
        data-level={heading.level}
        aria-label={heading.text}
        aria-current={isActive ? 'location' : undefined}
      >
        {/* Heading text - numbering will be added via CSS ::before */}
        <span className="heading-text block flex-1 truncate leading-relaxed">{heading.text}</span>
        {/* Active state indicator */}
        {isActive && <span className="ml-2 text-primary text-xs">•</span>}
      </a>

      {/* Render children nested within this item */}
      {hasChildren && isExpanded && renderChildren && (
        <div className="heading-children">{renderChildren(heading.children, depth + 1)}</div>
      )}
    </div>
  );
};

/**
 * Memoized HeadingTreeItem for performance optimization
 * Prevents unnecessary re-renders when props haven't changed
 */
export const HeadingTreeItem = memo(HeadingTreeItemComponent);
