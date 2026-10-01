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
  numberPath?: number[];
  /** Whether entries show their hierarchy number (default: true) */
  numbered?: boolean;
}

export function HeadingList({ headings, depth = 0, numberPath = [], numbered = true }: HeadingListProps) {
  return (
    <>
      {headings.map((heading, index) => (
        <HeadingTreeItem
          key={heading.id}
          heading={heading}
          depth={depth}
          numberPath={heading.level === 1 ? [] : [...numberPath, index + 1]}
          numbered={numbered}
        >
          {heading.children.length > 0 && (
            <HeadingList
              headings={heading.children}
              depth={depth + 1}
              numberPath={heading.level === 1 ? [] : [...numberPath, index + 1]}
              numbered={numbered}
            />
          )}
        </HeadingTreeItem>
      ))}
    </>
  );
}
