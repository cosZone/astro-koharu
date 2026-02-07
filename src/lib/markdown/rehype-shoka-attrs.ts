/**
 * Rehype plugin for Shoka-style attribute syntax
 *
 * Handles two patterns:
 * 1. Inline: [text]{.class1 .class2 #id} → <span class="class1 class2" id="id">text</span>
 * 2. Block-level: A paragraph containing only {.class} → applies to previous sibling element
 * 3. List item: trailing {.class} on li text → applies to the <li>
 */
import type { Element, ElementContent, Root, Text } from 'hast';
import { visit } from 'unist-util-visit';

/** Parse {.class1 .class2 #id key=value} into properties */
function parseAttrs(attrStr: string): Record<string, string> {
  const props: Record<string, string> = {};
  const classes: string[] = [];

  // Match .class, #id, key=value, key="value"
  const tokenRegex = /\.([a-zA-Z0-9_-]+)|#([a-zA-Z0-9_-]+)|([a-zA-Z0-9_-]+)=(?:"([^"]*)"|(\S+))/g;
  for (let match = tokenRegex.exec(attrStr); match !== null; match = tokenRegex.exec(attrStr)) {
    if (match[1]) classes.push(match[1]);
    else if (match[2]) props.id = match[2];
    else if (match[3]) {
      // Block event handler attributes (onclick, onerror, etc.) for security
      if (match[3].toLowerCase().startsWith('on')) continue;
      props[match[3]] = match[4] ?? match[5] ?? '';
    }
  }

  if (classes.length > 0) props.class = classes.join(' ');
  return props;
}

/** Apply parsed attributes to an element */
function applyAttrs(element: Element, attrs: Record<string, string>) {
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') {
      const existing = element.properties?.class;
      const existingStr = Array.isArray(existing) ? existing.join(' ') : (existing ?? '');
      element.properties = element.properties || {};
      element.properties.class = existingStr ? `${existingStr} ${value}` : value;
    } else {
      element.properties = element.properties || {};
      element.properties[key] = value;
    }
  }
}

/** Check if a text node contains inline attr syntax [text]{.class} */
const INLINE_ATTR_REGEX = /\[([^\]]*)\]\{([^}]+)\}/g;

/** Check if text is a block-level attr-only pattern {.class} */
const BLOCK_ATTR_REGEX = /^\{([^}]+)\}$/;

export function rehypeShokaAttrs() {
  return (tree: Root) => {
    // Pass 1: Handle block-level {.class} paragraphs → apply to previous sibling
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'p' || index === undefined || !parent) return;

      // Check if paragraph has only text content matching {.class}
      if (node.children.length !== 1 || node.children[0].type !== 'text') return;
      const text = node.children[0].value.trim();
      const blockMatch = BLOCK_ATTR_REGEX.exec(text);
      if (!blockMatch) return;

      const attrs = parseAttrs(blockMatch[1]);

      // Find previous sibling element
      for (let i = index - 1; i >= 0; i--) {
        const sibling = parent.children[i];
        if (sibling.type === 'element') {
          applyAttrs(sibling, attrs);
          // Remove this paragraph — return index so visitor continues from same position
          parent.children.splice(index, 1);
          return index;
        }
        // Skip text nodes that are just whitespace
        if (sibling.type === 'text' && sibling.value.trim() === '') continue;
        break;
      }
    });

    // Pass 2: Handle list item trailing {.class}
    // Scans all children of <li> for trailing {.class} patterns — handles:
    //   - Direct text child (simple li)
    //   - Text inside <p> child (loose list / nested list case)
    //   - Non-last text children (li with sub-list where text precedes <ul>)
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'li') return;

      for (const child of node.children) {
        let textNode: Text | undefined;

        if (child.type === 'text') {
          textNode = child;
        } else if (child.type === 'element' && child.children.length > 0) {
          const last = child.children[child.children.length - 1];
          if (last?.type === 'text') textNode = last as Text;
        }

        if (!textNode) continue;

        const match = textNode.value.match(/\{([^}]+)\}\s*$/);
        if (match) {
          const attrs = parseAttrs(match[1]);
          textNode.value = textNode.value.slice(0, match.index).trimEnd();
          applyAttrs(node, attrs);
          return;
        }
      }
    });

    // Pass 2.5: Handle trailing {.class} text after element siblings
    // e.g., <ins>text</ins>{.wavy} → apply .wavy to <ins>
    const TRAILING_ATTR_REGEX = /^\{([^}]+)\}/;

    visit(tree, 'element', (node: Element) => {
      const { children } = node;
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        if (child.type !== 'text') continue;

        const match = TRAILING_ATTR_REGEX.exec(child.value);
        if (!match) continue;

        // Find the preceding element sibling (skip whitespace-only text nodes)
        let prevElement: Element | null = null;
        for (let j = i - 1; j >= 0; j--) {
          if (children[j].type === 'element') {
            prevElement = children[j] as Element;
            break;
          }
          if (children[j].type === 'text' && (children[j] as Text).value.trim() === '') continue;
          break;
        }

        if (!prevElement) continue;

        applyAttrs(prevElement, parseAttrs(match[1]));

        const remaining = child.value.slice(match[0].length);
        if (remaining) {
          child.value = remaining;
        } else {
          children.splice(i, 1);
        }
      }
    });

    // Pass 3: Handle inline [text]{.class} in text nodes
    visit(tree, 'text', (node: Text, index, parent) => {
      if (index === undefined || !parent) return;
      if (!('children' in parent)) return;

      const text = node.value;
      if (!text.includes(']{')) return;

      INLINE_ATTR_REGEX.lastIndex = 0;
      const parts: ElementContent[] = [];
      let lastIndex = 0;
      for (let match = INLINE_ATTR_REGEX.exec(text); match !== null; match = INLINE_ATTR_REGEX.exec(text)) {
        // Text before match
        if (match.index > lastIndex) {
          parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }

        const content = match[1];
        const attrStr = match[2];
        const attrs = parseAttrs(attrStr);

        const span: Element = {
          type: 'element',
          tagName: 'span',
          properties: {},
          children: [{ type: 'text', value: content }],
        };
        applyAttrs(span, attrs);
        parts.push(span);

        lastIndex = match.index + match[0].length;
      }

      if (parts.length === 0) return;

      // Remaining text
      if (lastIndex < text.length) {
        parts.push({ type: 'text', value: text.slice(lastIndex) });
      }

      // Replace original text node — skip past newly inserted parts
      (parent as Element).children.splice(index, 1, ...parts);
      return index + parts.length;
    });
  };
}
