/**
 * Remark plugin for Shoka spoiler syntax
 *
 * !!text!! → <span class="spoiler">text</span>
 * !!text!!{.blur} → <span class="spoiler blur">text</span>
 */
import type { PhrasingContent, Root } from 'mdast';
import { visit } from 'unist-util-visit';

const SPOILER_REGEX = /!!([^!\s](?:[^!]*[^!\s])?)!!/g;

/** Matches a trailing {.class #id key=value} attribute block */
const TRAILING_ATTRS = /^\{([^}]+)\}/;

/** Extract extra classes from attr tokens (.class only, others ignored for spoiler) */
function extractClasses(raw: string): string[] {
  return raw
    .split(/\s+/)
    .filter((t) => t.startsWith('.'))
    .map((t) => t.slice(1));
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
        let classes = 'spoiler';
        const afterMatch = text.slice(match.index + match[0].length);
        const attrMatch = TRAILING_ATTRS.exec(afterMatch);
        if (attrMatch) {
          const extra = extractClasses(attrMatch[1]);
          if (extra.length > 0) classes += ` ${extra.join(' ')}`;
          SPOILER_REGEX.lastIndex += attrMatch[0].length;
        }

        parts.push({
          type: 'html',
          value: `<span class="${classes}">${match[1]}</span>`,
        });

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
