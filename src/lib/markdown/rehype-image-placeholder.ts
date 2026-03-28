/**
 * Rehype plugin to enhance images with lazy loading and placeholder containers
 * Wraps images in figure elements with placeholder styling for CLS prevention
 */
import type { Element, Root, Text } from 'hast';
import { SKIP, visit } from 'unist-util-visit';

export function rehypeImagePlaceholder() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'img') return;
      if (index === undefined || !parent) return;

      // Skip if already wrapped (e.g., in a figure or custom component)
      if (parent.type === 'element' && parent.tagName === 'figure') return;

      // Images inside <a> links: apply lazy/async but skip figure wrapping —
      // wrapping would break the link and the image lacks a standalone caption context
      if (parent.type === 'element' && parent.tagName === 'a') {
        node.properties = {
          ...node.properties,
          loading: 'lazy',
          decoding: 'async',
        };
        return;
      }

      // Get existing class (handle both string and array formats per HAST spec)
      const existingClass = Array.isArray(node.properties?.class)
        ? node.properties.class.join(' ')
        : (node.properties?.class ?? '');

      // Add lazy loading attributes and class
      node.properties = {
        ...node.properties,
        loading: 'lazy',
        decoding: 'async',
        class: `${existingClass} markdown-image`.trim(),
      };

      const alt = typeof node.properties?.alt === 'string' ? node.properties.alt.trim() : '';
      const caption: Element | null = alt
        ? {
            type: 'element',
            tagName: 'figcaption',
            properties: { class: 'markdown-image-caption' },
            children: [{ type: 'text', value: alt }],
          }
        : null;

      // Wrap in figure container
      const wrapper: Element = {
        type: 'element',
        tagName: 'figure',
        properties: { class: 'markdown-image-wrapper' },
        children: caption ? [node, caption] : [node],
      };

      // Replace img with wrapper
      parent.children[index] = wrapper;
    });

    // Second pass: unwrap <p> that only contains <figure> elements
    // Fixes invalid <p><figure> nesting that breaks portrait image grouping
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'p' || index === undefined || !parent) return;

      const meaningful = node.children.filter((c) => !(c.type === 'text' && (c as Text).value.trim() === ''));
      if (meaningful.length > 0 && meaningful.every((c) => c.type === 'element' && (c as Element).tagName === 'figure')) {
        parent.children.splice(index, 1, ...node.children);
        return [SKIP, index] as const;
      }
    });
  };
}
