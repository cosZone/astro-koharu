/**
 * HeadingTreeItem Component
 *
 * A single heading row in the table of contents. Active state and the click
 * handler come from TocContext; nested levels arrive as children.
 */

import type { Heading } from '@lib/toc';
import { cn } from '@/lib/utils';
import { useTocContext } from './TocContext';

// Constants
const INDENT_BASE = 0.75; // Base left padding in rem
const INDENT_PER_LEVEL = 1; // Additional padding per nesting level in rem

interface HeadingTreeItemProps {
  /** The heading node to render */
  heading: Heading;
  /** Current nesting depth (0 for top level) */
  depth?: number;
  /** Rendered child level, when expanded */
  children?: React.ReactNode;
}

export function HeadingTreeItem({ heading, depth = 0, children }: HeadingTreeItemProps) {
  const { activeId, onHeadingClick } = useTocContext();
  const isActive = activeId === heading.id;
  const hasChildren = heading.children.length > 0;

  return (
    <div className="heading-tree-item relative">
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

      {children && <div className="heading-children">{children}</div>}
    </div>
  );
}
