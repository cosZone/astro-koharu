/**
 * Remark plugin for Shoka spoiler syntax
 *
 * !!text!! → <spoiler-span>text</spoiler-span> (spoilerjs web component)
 * !!text!!{.blur} → <span class="spoiler blur">text</span> (CSS blur effect)
 */
import type { PhrasingContent, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { escapeHtml } from './shoka-renderers';

const SPOILER_REGEX = /!!([^!\s](?:[^!]*[^!\s])?)!!/g;

/** Matches a trailing {.class #id key=value} attribute block */
const TRAILING_ATTRS = /^\{([^}]+)\}/;

/** Validates a CSS identifier (class name) */
const CSS_IDENT = /^[a-zA-Z_-][a-zA-Z0-9_-]*$/;

/** Extract extra classes from attr tokens (.class only, others ignored for spoiler) */
function extractClasses(raw: string): string[] {
  return raw
    .split(/\s+/)
    .filter((t) => t.startsWith('.'))
    .map((t) => t.slice(1))
    .filter((cls) => CSS_IDENT.test(cls));
}

export function remarkShokaSpoiler() {
  return (tree: Root) => {
    visit(tree, 'text', (node, index, parent) => {
      if (index === undefined || !parent) return;
      if (!('children' in parent)) return;

      const text = node.value;
      SPOILER_REGEX.lastIndex = 0;
      const parts: PhrasingContent[] = [];
      let lastIndex = 0;
      for (let match = SPOILER_REGEX.exec(text); match !== null; match = SPOILER_REGEX.exec(text)) {
        if (match.index > lastIndex) {
          parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }

        // Check for trailing {attrs}
        let extraClasses: string[] = [];
        const afterMatch = text.slice(match.index + match[0].length);
        const attrMatch = TRAILING_ATTRS.exec(afterMatch);
        if (attrMatch) {
          extraClasses = extractClasses(attrMatch[1]);
          SPOILER_REGEX.lastIndex += attrMatch[0].length;
        }

        const safeContent = escapeHtml(match[1]);
        if (extraClasses.includes('blur')) {
          // Blur variant: keep CSS-based spoiler
          const classes = `spoiler ${extraClasses.join(' ')}`;
          parts.push({ type: 'html', value: `<span class="${classes}">${safeContent}</span>` });
        } else {
          // Default: use spoilerjs web component for particle animation
          const classAttr = extraClasses.length > 0 ? ` class="${extraClasses.join(' ')}"` : '';
          parts.push({ type: 'html', value: `<spoiler-span${classAttr}>${safeContent}</spoiler-span>` });
        }

        lastIndex = SPOILER_REGEX.lastIndex;
      }

      if (parts.length === 0) return;

      if (lastIndex < text.length) {
        parts.push({ type: 'text', value: text.slice(lastIndex) });
      }

      parent.children.splice(index, 1, ...parts);
    });
  };
}
