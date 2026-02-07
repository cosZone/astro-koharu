/**
 * Remark plugins for Shoka text effects
 *
 * - remarkIns: ++text++ → <ins>text</ins>
 * - remarkMark: ==text== → <mark>text</mark>
 *
 * All plugins transform text nodes within paragraphs and list items,
 * replacing matched patterns with HTML nodes.
 *
 * Note: ~sub~ / ^sup^ is handled by shoka-preprocessor.ts (text-level)
 * because it conflicts with GFM's strikethrough parser.
 */
import type { PhrasingContent, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { escapeHtml } from './shoka-renderers';

/** Validates a CSS identifier (class name, id) */
const CSS_IDENT = /^[a-zA-Z_-][a-zA-Z0-9_-]*$/;

/** Matches a trailing {.class #id key=value} attribute block */
const TRAILING_ATTRS = /^\{([^}]+)\}/;

/** Parse attr tokens (.class, #id, key=value) into an HTML attribute string */
function buildAttrString(raw: string): string {
  const classes: string[] = [];
  let id = '';
  const attrs: string[] = [];

  for (const token of raw.split(/\s+/)) {
    if (token.startsWith('.')) {
      const cls = token.slice(1);
      if (CSS_IDENT.test(cls)) classes.push(cls);
    } else if (token.startsWith('#')) {
      const idVal = token.slice(1);
      if (CSS_IDENT.test(idVal)) id = idVal;
    } else if (token.includes('=')) {
      const [key, ...rest] = token.split('=');
      if (CSS_IDENT.test(key)) attrs.push(`${key}="${escapeHtml(rest.join('='))}"`);
    }
  }

  const parts: string[] = [];
  if (id) parts.push(`id="${id}"`);
  if (classes.length > 0) parts.push(`class="${classes.join(' ')}"`);
  parts.push(...attrs);
  return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}

/** Generic inline syntax replacer for remark AST */
function createInlinePlugin(pattern: RegExp, tagName: string) {
  return () => (tree: Root) => {
    visit(tree, 'text', (node, index, parent) => {
      if (index === undefined || !parent) return;
      if (!('children' in parent)) return;

      const text = node.value;
      pattern.lastIndex = 0;
      const parts: PhrasingContent[] = [];
      let lastIndex = 0;

      for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
        // Text before match
        if (match.index > lastIndex) {
          parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }

        // Check for trailing {attrs} immediately after the match
        let attrStr = '';
        const afterMatch = text.slice(match.index + match[0].length);
        const attrMatch = TRAILING_ATTRS.exec(afterMatch);
        if (attrMatch) {
          attrStr = buildAttrString(attrMatch[1]);
          // Advance past the consumed {attrs}
          pattern.lastIndex += attrMatch[0].length;
        }

        parts.push({
          type: 'html',
          value: `<${tagName}${attrStr}>${escapeHtml(match[1])}</${tagName}>`,
        });

        lastIndex = pattern.lastIndex;
      }

      if (parts.length === 0) return;

      // Remaining text
      if (lastIndex < text.length) {
        parts.push({ type: 'text', value: text.slice(lastIndex) });
      }

      // Replace original node
      parent.children.splice(index, 1, ...parts);
    });
  };
}

/**
 * ++text++ → <ins>text</ins>
 * Non-greedy match, no nesting. Requires non-space after opening ++
 */
export const remarkIns = createInlinePlugin(/\+\+([^\s+](?:[^+]*[^\s+])?)\+\+/g, 'ins');

/**
 * ==text== → <mark>text</mark>
 * Non-greedy match, requires non-space after opening ==
 */
export const remarkMark = createInlinePlugin(/==([^\s=](?:[^=]*[^\s=])?)(?<!=)==/g, 'mark');
