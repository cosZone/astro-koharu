/**
 * Remark plugin for Shoka ruby (furigana) syntax
 *
 * {text^annotation} → <ruby>text<rp>(</rp><rt>annotation</rt><rp>)</rp></ruby>
 * {text^=annotation} → whole-word ruby annotation
 * {text^*} → emphasis dots (text-emphasis: filled circle)
 */
import type { PhrasingContent, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { escapeHtml } from './shoka-renderers';

// Match {text^annotation}, but NOT {.class} (which starts with .)
const RUBY_REGEX = /\{([^{}^.][^{}^]*)\^([^{}]+)\}/g;

export function remarkShokaRuby() {
  return (tree: Root) => {
    visit(tree, 'text', (node, index, parent) => {
      if (index === undefined || !parent) return;
      if (!('children' in parent)) return;

      const text = node.value;
      RUBY_REGEX.lastIndex = 0;
      const parts: PhrasingContent[] = [];
      let lastIndex = 0;
      for (let match = RUBY_REGEX.exec(text); match !== null; match = RUBY_REGEX.exec(text)) {
        if (match.index > lastIndex) {
          parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }

        const baseText = match[1];
        const annotation = match[2];

        if (annotation === '*') {
          // Emphasis dots
          parts.push({
            type: 'html',
            value: `<span style="text-emphasis:filled circle;-webkit-text-emphasis:filled circle">${escapeHtml(baseText)}</span>`,
          });
        } else if (annotation.startsWith('=')) {
          // Whole-word annotation (remove leading =)
          const rubyText = annotation.slice(1);
          parts.push({
            type: 'html',
            value: `<ruby>${escapeHtml(baseText)}<rp>(</rp><rt>${escapeHtml(rubyText)}</rt><rp>)</rp></ruby>`,
          });
        } else {
          // Standard ruby annotation
          parts.push({
            type: 'html',
            value: `<ruby>${escapeHtml(baseText)}<rp>(</rp><rt>${escapeHtml(annotation)}</rt><rp>)</rp></ruby>`,
          });
        }

        lastIndex = match.index + match[0].length;
      }

      if (parts.length === 0) return;

      if (lastIndex < text.length) {
        parts.push({ type: 'text', value: text.slice(lastIndex) });
      }

      parent.children.splice(index, 1, ...parts);
    });
  };
}
