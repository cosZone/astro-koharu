/**
 * useExpandedState Hook
 *
 * Manages accordion expand/collapse state for TableOfContents.
 * Handles auto-expansion of parents when active heading changes.
 *
 * @example
 * ```tsx
 * function TableOfContents() {
 *   const headings = useHeadingTree();
 *   const activeId = useActiveHeading();
 *   const { expandedIds, isExpanded, toggleExpanded } = useExpandedState({
 *     headings,
 *     activeId,
 *     defaultExpanded: false
 *   });
 *
 *   return (
 *     <nav>
 *       {headings.map(heading => (
 *         <div key={heading.id}>
 *           <button onClick={() => toggleExpanded(heading.id)}>
 *             {heading.text}
 *           </button>
 *           {isExpanded(heading.id) && renderChildren(heading.children)}
 *         </div>
 *       ))}
 *     </nav>
 *   );
 * }
 * ```
 */

import { useCallback, useEffect, useState } from 'react';
import type { Heading } from './useHeadingTree';
import { findHeadingById, getParentIds, getSiblingIds } from './useHeadingTree';

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
  /** Check if a heading is expanded */
  isExpanded: (id: string) => boolean;
  /** Toggle expand/collapse for a heading */
  toggleExpanded: (id: string) => void;
  /** Manually set expanded state */
  setExpandedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

/**
 * Hook to manage expand/collapse state for heading accordion
 *
 * @param options - Expanded state options
 * @returns Expanded state and control functions
 */
export function useExpandedState({
  headings,
  activeId,
  defaultExpanded = false,
}: UseExpandedStateOptions): UseExpandedStateReturn {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    if (defaultExpanded) {
      const allIds = new Set<string>();
      function collectIds(headings: Heading[]) {
        headings.forEach((heading) => {
          if (heading.children.length > 0) {
            allIds.add(heading.id);
          }
          collectIds(heading.children);
        });
      }
      collectIds(headings);
      return allIds;
    }
    return new Set();
  });

  // Auto-expand parents when activeId changes
  useEffect(() => {
    if (activeId && headings.length > 0) {
      const activeHeading = findHeadingById(headings, activeId);
      if (activeHeading) {
        const parentIds = getParentIds(activeHeading);

        // Include the active heading itself if it has children
        const allHeadingsToProcess = [...parentIds];
        if (activeHeading.children.length > 0) {
          allHeadingsToProcess.unshift(activeId);
        }

        if (allHeadingsToProcess.length > 0) {
          setExpandedIds((prev) => {
            const newSet = new Set(prev);

            // For each parent level, apply accordion effect
            const parentsByLevel: { [level: number]: string[] } = {};

            // Group parents by level
            allHeadingsToProcess.forEach((parentId) => {
              const parentHeading = findHeadingById(headings, parentId);
              if (parentHeading) {
                if (!parentsByLevel[parentHeading.level]) {
                  parentsByLevel[parentHeading.level] = [];
                }
                parentsByLevel[parentHeading.level].push(parentId);
              }
            });

            // For each level, close siblings and open the required parent
            Object.keys(parentsByLevel).forEach((levelStr) => {
              const level = parseInt(levelStr, 10);
              const parentsAtLevel = parentsByLevel[level];

              parentsAtLevel.forEach((parentId) => {
                const parentHeading = findHeadingById(headings, parentId);
                if (parentHeading) {
                  // Close siblings at this level
                  const siblingIds = getSiblingIds(parentHeading, headings);
                  siblingIds.forEach((siblingId) => {
                    newSet.delete(siblingId);
                  });

                  // Open this parent
                  newSet.add(parentId);
                }
              });
            });

            return newSet;
          });
        }
      }
    }
  }, [activeId, headings]);

  /**
   * Check if a heading is expanded
   */
  const isExpanded = useCallback(
    (id: string): boolean => {
      return expandedIds.has(id);
    },
    [expandedIds],
  );

  /**
   * Toggle expand/collapse for a heading
   */
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  return {
    expandedIds,
    isExpanded,
    toggleExpanded,
    setExpandedIds,
  };
}
