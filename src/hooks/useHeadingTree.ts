/**
 * useHeadingTree Hook
 *
 * Extracts heading tree building and numbering logic from TableOfContents.
 * Builds a hierarchical structure from flat heading list and calculates numbering.
 *
 * @example
 * ```tsx
 * function TableOfContents() {
 *   const headings = useHeadingTree();
 *
 *   return (
 *     <nav>
 *       {headings.map(heading => (
 *         <div key={heading.id}>{heading.text}</div>
 *       ))}
 *     </nav>
 *   );
 * }
 * ```
 */

import { useEffect, useState } from 'react';

export interface Heading {
  id: string;
  text: string;
  level: number;
  children: Heading[];
  parent?: Heading;
}

/**
 * Build hierarchical structure from flat heading list
 */
function buildHeadingTree(flatHeadings: Array<{ id: string; text: string; level: number }>): Heading[] {
  const tree: Heading[] = [];
  const stack: Heading[] = [];

  flatHeadings.forEach((heading) => {
    const newHeading: Heading = {
      ...heading,
      children: [],
    };

    // Find the appropriate parent
    while (stack.length > 0 && stack[stack.length - 1].level >= newHeading.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      // This is a root level heading
      tree.push(newHeading);
    } else {
      // This is a child of the last item in stack
      const parent = stack[stack.length - 1];
      parent.children.push(newHeading);
      newHeading.parent = parent;
    }

    stack.push(newHeading);
  });

  return tree;
}

/**
 * Hook to build heading tree from article content
 *
 * @returns Hierarchical heading tree with numbering
 */
export function useHeadingTree(): Heading[] {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [_pageKey, setPageKey] = useState(0);

  // 监听 Astro 页面切换，触发重新构建 heading tree
  useEffect(() => {
    const handlePageLoad = () => setPageKey((k) => k + 1);
    document.addEventListener('astro:page-load', handlePageLoad);
    return () => document.removeEventListener('astro:page-load', handlePageLoad);
  }, []);

  useEffect(() => {
    const articleContent = document.querySelector('article');
    if (!articleContent) {
      setHeadings([]);
      return;
    }

    // Get all heading elements, excluding those inside .link-preview-block
    // Using :not() pseudo-class for better performance (single DOM traversal)
    const headingElements = articleContent.querySelectorAll(
      'h1:not(.link-preview-block h1), ' +
        'h2:not(.link-preview-block h2), ' +
        'h3:not(.link-preview-block h3), ' +
        'h4:not(.link-preview-block h4), ' +
        'h5:not(.link-preview-block h5), ' +
        'h6:not(.link-preview-block h6)',
    );

    // If no headings, don't show TOC
    if (headingElements.length === 0) return;

    // Process heading elements (convert NodeList to Array for map)
    const flatHeadings: Array<{ id: string; text: string; level: number }> = Array.from(headingElements).map(
      (heading, index) => {
        // Use existing ID or create fallback ID
        let id = heading.id;
        if (!id) {
          // Create slug-like ID from text content
          const text = heading.textContent || '';
          id =
            text
              .toLowerCase()
              .replace(/[^\w\s-]/g, '') // Remove special characters except words, spaces, hyphens
              .replace(/\s+/g, '-') // Replace spaces with hyphens
              .trim() || `heading-${index}`; // Fallback to index-based ID

          // Set the ID on the element for future use
          heading.id = id;
        }

        return {
          id,
          text: heading.textContent || '',
          level: parseInt(heading.tagName.substring(1), 10), // Get heading level (1-6)
        };
      },
    );

    // Build hierarchical structure
    const headingTree = buildHeadingTree(flatHeadings);

    // Numbering is now handled by CSS counters (see post.css)
    setHeadings(headingTree);
  }, []); // pageKey 变化时重新构建 heading tree

  return headings;
}

/**
 * Find a heading by ID in the tree structure
 */
export function findHeadingById(headings: Heading[], id: string): Heading | null {
  for (const heading of headings) {
    if (heading.id === id) {
      return heading;
    }
    const found = findHeadingById(heading.children, id);
    if (found) {
      return found;
    }
  }
  return null;
}

/**
 * Get all parent IDs for a given heading
 */
export function getParentIds(heading: Heading): string[] {
  const parentIds: string[] = [];
  let current = heading.parent;
  while (current) {
    parentIds.push(current.id);
    current = current.parent;
  }
  return parentIds;
}

/**
 * Get all siblings of a heading (headings at the same level with the same parent)
 */
export function getSiblingIds(targetHeading: Heading, allHeadings: Heading[]): string[] {
  const siblings: string[] = [];

  if (!targetHeading.parent) {
    // This is a root level heading, get all root level headings
    allHeadings.forEach((heading) => {
      if (heading.id !== targetHeading.id && heading.children.length > 0) {
        siblings.push(heading.id);
      }
    });
  } else {
    // This has a parent, get all children of the parent
    targetHeading.parent.children.forEach((heading) => {
      if (heading.id !== targetHeading.id && heading.children.length > 0) {
        siblings.push(heading.id);
      }
    });
  }

  return siblings;
}
