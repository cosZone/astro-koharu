/**
 * HeadingList Component
 *
 * Renders a heading level and recurses into every branch; collapsed branches stay mounted so
 * HeadingTreeItem can animate them open.
 */

import type { Heading } from '@lib/toc';
import { HeadingTreeItem } from './HeadingTreeItem';

interface HeadingListProps {
  /** Heading nodes to render at this level */
  headings: Heading[];
  /** Current nesting depth (0 for top level) */
  depth?: number;
}

export function HeadingList({ headings, depth = 0 }: HeadingListProps) {
  return (
    <>
      {headings.map((heading) => (
        <HeadingTreeItem key={heading.id} heading={heading} depth={depth}>
          {heading.children.length > 0 && <HeadingList headings={heading.children} depth={depth + 1} />}
        </HeadingTreeItem>
      ))}
    </>
  );
}
