/**
 * useHeadingTree Hook
 *
 * Scans the article for headings and builds the hierarchical TOC tree.
 * Tree shape and traversal helpers live in `@lib/toc`.
 *
 * @example
 * ```tsx
 * const headings = useHeadingTree();
 * ```
 */

import { buildHeadingTree, type Heading } from '@lib/toc';
import { useEffect, useState } from 'react';

/** Every heading level inside the article, excluding link preview cards */
const HEADING_SELECTOR = [1, 2, 3, 4, 5, 6].map((level) => `h${level}:not(.link-preview-block h${level})`).join(', ');

/** Slug fallback for headings the markdown pipeline left without an id */
function fallbackId(text: string, index: number): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim() || `heading-${index}`
  );
}

/**
 * Hook to build the heading tree from article content.
 * Rebuilds on page navigation and after encrypted content is decrypted.
 */
export function useHeadingTree(): Heading[] {
  const [headings, setHeadings] = useState<Heading[]>([]);

  useEffect(() => {
    const buildTree = () => {
      const article = document.querySelector('article');
      if (!article) {
        setHeadings([]);
        return;
      }

      const elements = Array.from(article.querySelectorAll<HTMLElement>(HEADING_SELECTOR));
      if (elements.length === 0) {
        setHeadings([]);
        return;
      }

      // Numbering is handled by CSS counters (see post.css)
      setHeadings(
        buildHeadingTree(
          elements.map((element, index) => {
            const text = element.textContent || '';
            if (!element.id) element.id = fallbackId(text, index);
            return { id: element.id, text, level: parseInt(element.tagName.substring(1), 10) };
          }),
        ),
      );
    };

    buildTree();
    document.addEventListener('astro:page-load', buildTree);
    document.addEventListener('content:decrypted', buildTree);
    return () => {
      document.removeEventListener('astro:page-load', buildTree);
      document.removeEventListener('content:decrypted', buildTree);
    };
  }, []);

  return headings;
}
