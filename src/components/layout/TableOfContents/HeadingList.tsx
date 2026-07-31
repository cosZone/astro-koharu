/**
 * HeadingList Component
 *
 * Renders a heading level and recurses into the expanded branches.
 * State comes from TocContext.
 */

import type { Heading } from '@lib/toc';
import { HeadingTreeItem } from './HeadingTreeItem';
import { useTocContext } from './TocContext';

interface HeadingListProps {
  /** Heading nodes to render at this level */
  headings: Heading[];
  /** Current nesting depth (0 for top level) */
  depth?: number;
}

export function HeadingList({ headings, depth = 0 }: HeadingListProps) {
  const { expandedIds } = useTocContext();

  return (
    <>
      {headings.map((heading) => (
        <HeadingTreeItem key={heading.id} heading={heading} depth={depth}>
          {heading.children.length > 0 && expandedIds.has(heading.id) && (
            <HeadingList headings={heading.children} depth={depth + 1} />
          )}
        </HeadingTreeItem>
      ))}
    </>
  );
}
