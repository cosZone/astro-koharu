/**
 * useEditorHeadings Hook
 *
 * Extracts heading blocks from BlockNote editor and tracks changes.
 * Used for building the editor's table of contents.
 */

import type { BlockNoteEditor } from '@blocknote/core';
import { useEffect, useState } from 'react';

export interface EditorHeading {
  /** BlockNote block ID for navigation */
  id: string;
  /** Heading text content */
  text: string;
  /** Heading level (1-3) */
  level: 1 | 2 | 3;
}

/** BlockNote inline content item (simplified type) */
interface InlineContentItem {
  type: string;
  text?: string;
  content?: InlineContentItem[];
}

/**
 * Extracts plain text from BlockNote inline content
 */
function extractTextFromContent(content: InlineContentItem[]): string {
  return content
    .map((item) => {
      if (item.type === 'text' && item.text) return item.text;
      if (item.type === 'link' && item.content) return extractTextFromContent(item.content);
      return '';
    })
    .join('');
}

/**
 * Extracts all headings from the editor document
 */
// biome-ignore lint/suspicious/noExplicitAny: BlockNoteEditor generics are complex when using custom schemas
function extractHeadings(editor: BlockNoteEditor<any, any, any>): EditorHeading[] {
  const headings: EditorHeading[] = [];

  editor.forEachBlock((block) => {
    if (block.type === 'heading' && block.props.level <= 3) {
      const text = extractTextFromContent(block.content as InlineContentItem[]);
      if (text.trim()) {
        headings.push({
          id: block.id,
          text: text.trim(),
          level: block.props.level as 1 | 2 | 3,
        });
      }
    }
    return true; // Continue traversal
  });

  return headings;
}

/**
 * Hook to extract and track headings from BlockNote editor
 *
 * @param editor - BlockNote editor instance
 * @returns Array of heading objects with id, text, and level
 */
// biome-ignore lint/suspicious/noExplicitAny: BlockNoteEditor generics are complex when using custom schemas
export function useEditorHeadings(editor: BlockNoteEditor<any, any, any> | null): EditorHeading[] {
  const [headings, setHeadings] = useState<EditorHeading[]>([]);

  useEffect(() => {
    if (!editor) return;

    // Initial extraction
    setHeadings(extractHeadings(editor));

    // Subscribe to changes
    const unsubscribe = editor.onChange(() => {
      setHeadings(extractHeadings(editor));
    });

    return unsubscribe;
  }, [editor]);

  return headings;
}
