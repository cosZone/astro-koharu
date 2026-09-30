/**
 * HeadingTreeItem Component
 *
 * A single heading row in the table of contents: a knot on the silk thread plus the heading text
 * (see toc.css). Active and expanded state and the click handler come from TocContext; nested levels
 * arrive as children and stay mounted so they can unfold and fold smoothly.
 */

import type { Heading } from '@lib/toc';
import { cn } from '@/lib/utils';
import { useTocContext } from './TocContext';

// Constants
const INDENT_BASE = 1.625; // Base left padding in rem, clear of the thread
const INDENT_PER_LEVEL = 0.875; // Additional padding per nesting level in rem

interface HeadingTreeItemProps {
  /** The heading node to render */
  heading: Heading;
  /** Current nesting depth (0 for top level) */
  depth?: number;
  /** Rendered child level */
  children?: React.ReactNode;
}

export function HeadingTreeItem({ heading, depth = 0, children }: HeadingTreeItemProps) {
  const { activeId, expandedIds, onHeadingClick } = useTocContext();
  const isActive = activeId === heading.id;
  const isOpen = expandedIds.has(heading.id);

  return (
    <div className="heading-tree-item relative">
      <a
        href={`#${heading.id}`}
        onClick={(e) => {
          e.preventDefault();
          onHeadingClick(heading.id);
        }}
        className={cn(
          'heading-link group relative isolate flex items-center rounded-lg py-2 text-sm transition-colors duration-200',
          isActive ? 'font-medium text-primary' : 'hover:bg-foreground/5',
        )}
        style={{
          paddingLeft: `${INDENT_BASE + depth * INDENT_PER_LEVEL}rem`,
          paddingRight: '0.75rem',
        }}
        data-level={heading.level}
        data-toc-row={heading.id}
        aria-label={heading.text}
        aria-current={isActive ? 'location' : undefined}
      >
        <span className="toc-node" aria-hidden="true" />
        {/* Heading text - numbering will be added via CSS ::before */}
        <span className="heading-text block flex-1 truncate leading-relaxed">{heading.text}</span>
      </a>

      {children && (
        <div className="heading-children" data-open={isOpen || undefined} inert={!isOpen}>
          <div className="heading-children-inner">{children}</div>
        </div>
      )}
    </div>
  );
}
