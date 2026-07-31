/**
 * useExpandedState Hook
 *
 * Owns the accordion expand/collapse state of a heading tree. The reveal
 * transition itself is the pure `revealPath` in `@lib/toc`.
 *
 * @example
 * ```tsx
 * const { expandedIds, revealTo } = useExpandedState({ headings, activeId });
 * ```
 */

import { collectExpandableIds, type Heading, revealPath } from '@lib/toc';
import { useCallback, useEffect, useState } from 'react';

export interface UseExpandedStateOptions {
  /** Heading tree */
  headings: Heading[];
  /** Currently active heading ID */
  activeId: string;
  /** Whether all headings should be expanded by default */
  defaultExpanded?: boolean;
}

export interface UseExpandedStateReturn {
  /** Set of expanded heading IDs */
  expandedIds: Set<string>;
  /** Expand the path to a heading, collapsing siblings along the way */
  revealTo: (id: string) => void;
  /** Toggle a single heading open or closed */
  toggle: (id: string) => void;
}

export function useExpandedState({
  headings,
  activeId,
  defaultExpanded = false,
}: UseExpandedStateOptions): UseExpandedStateReturn {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    defaultExpanded ? collectExpandableIds(headings) : new Set(),
  );

  const revealTo = useCallback(
    (id: string) => {
      setExpandedIds((prev) => revealPath(headings, id, prev));
    },
    [headings],
  );

  // Follow the active heading as the reader scrolls
  useEffect(() => {
    if (activeId) revealTo(activeId);
  }, [activeId, revealTo]);

  const toggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  return { expandedIds, revealTo, toggle };
}
