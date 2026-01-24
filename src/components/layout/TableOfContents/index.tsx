/**
 * TableOfContents Component (Refactored with Sub-components)
 *
 * Displays a hierarchical table of contents with active heading detection and accordion behavior.
 * Uses custom hooks for state management and sub-components for better organization.
 */

import { useActiveHeading, useExpandedState, useHeadingClickHandler, useHeadingTree } from '@hooks/index';
import { HeadingList } from './HeadingList';

// Constants
const SCROLL_OFFSET_TOP = 120; // Offset for header height when detecting active heading

interface TableOfContentsProps {
  /** Whether headings should be expanded by default */
  defaultExpanded?: boolean;
  /** Whether to enable CSS counter numbering (default: true) */
  enableNumbering?: boolean;
}

/**
 * TableOfContents Component
 *
 * Main container for the table of contents. Manages heading state and
 * delegates rendering to HeadingList sub-component.
 */
export function TableOfContents({ defaultExpanded = false, enableNumbering = true }: TableOfContentsProps = {}) {
  // Use custom hooks for heading tree, active heading, and expand/collapse state
  const headings = useHeadingTree();
  const activeId = useActiveHeading({ offsetTop: SCROLL_OFFSET_TOP });
  const { expandedIds, setExpandedIds } = useExpandedState({
    headings,
    activeId,
    defaultExpanded,
  });

  // Handle heading click - scroll to heading and update expand state with accordion behavior
  const handleHeadingClick = useHeadingClickHandler({ headings, setExpandedIds });

  // Empty state
  if (headings.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        <div className="text-sm">暂无目录</div>
      </div>
    );
  }

  return (
    <nav
      className={`toc-container vertical-scrollbar scroll-gutter-stable flex h-full flex-col gap-2 overflow-auto pr-1 [--scrollbar-width:0.25rem] ${enableNumbering ? '' : 'toc-no-numbering'}`}
      aria-label="文章目录"
    >
      <HeadingList
        headings={headings}
        depth={0}
        activeId={activeId}
        expandedIds={expandedIds}
        onHeadingClick={handleHeadingClick}
      />
    </nav>
  );
}
