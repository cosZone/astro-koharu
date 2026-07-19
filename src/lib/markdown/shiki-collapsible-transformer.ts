import type { Element } from 'hast';
import type { ShikiTransformer } from 'shiki';
import { COLLAPSE_LINE_THRESHOLD } from '../../constants/code-block';

/** Wrap long highlighted blocks before HTML serialization so they are collapsed on first paint. */
export function collapsibleCodeTransformer(): ShikiTransformer {
  return {
    name: 'collapsible-code',
    root(root) {
      if (this.pre.tagName !== 'pre') return;
      if (this.source.trimStart().startsWith('infographic ')) return;
      if (this.source.replace(/\n$/, '').split('\n').length <= COLLAPSE_LINE_THRESHOLD) return;

      const preIndex = root.children.indexOf(this.pre);
      if (preIndex === -1) return;

      const wrapper: Element = {
        type: 'element',
        tagName: 'div',
        properties: { class: 'code-block-wrapper code-collapsible code-collapsed' },
        children: [
          {
            type: 'element',
            tagName: 'div',
            properties: { class: 'code-block-wrapper-toolbar-mount' },
            children: [],
          },
          this.pre,
        ],
      };

      root.children[preIndex] = wrapper;
    },
  };
}
