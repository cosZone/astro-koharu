/**
 * useTocController Hook
 *
 * Single assembly point for the TOC subsystem: heading tree, active heading,
 * accordion state and the click handler. Returns the tree plus a ready-made
 * `TocContextValue` for `TocProvider`.
 *
 * @example
 * ```tsx
 * const { headings, toc } = useTocController({ offsetTop: 120 });
 * return <TocProvider value={toc}><HeadingList headings={headings} /></TocProvider>;
 * ```
 */

import type { Heading, TocContextValue } from '@lib/toc';
import { useMemo } from 'react';
import { useActiveHeading } from './useActiveHeading';
import { useExpandedState } from './useExpandedState';
import { useHeadingClickHandler } from './useHeadingClickHandler';
import { useHeadingTree } from './useHeadingTree';

export interface UseTocControllerOptions {
  /** Offset from top of viewport for detecting the active heading */
  offsetTop?: number;
  /** Whether headings should be expanded by default */
  defaultExpanded?: boolean;
}

export interface UseTocControllerReturn {
  /** Hierarchical heading tree of the current article */
  headings: Heading[];
  /** Context value for the heading tree components */
  toc: TocContextValue;
}

export function useTocController({
  offsetTop = 120,
  defaultExpanded = false,
}: UseTocControllerOptions = {}): UseTocControllerReturn {
  const headings = useHeadingTree();
  const activeId = useActiveHeading({ offsetTop });
  const { expandedIds, revealTo } = useExpandedState({ headings, activeId, defaultExpanded });
  const onHeadingClick = useHeadingClickHandler({ revealTo });

  const toc = useMemo(() => ({ activeId, expandedIds, onHeadingClick }), [activeId, expandedIds, onHeadingClick]);

  return { headings, toc };
}
