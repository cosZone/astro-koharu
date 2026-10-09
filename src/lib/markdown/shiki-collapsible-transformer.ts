import type { Element } from 'hast';
import type { ShikiTransformer } from 'shiki';
import { COLLAPSE_LINE_THRESHOLD } from '../../constants/code-block';

/** Reserve toolbar space before hydration, and collapse long blocks on first paint. */
export function collapsibleCodeTransformer(): ShikiTransformer {
  return {
    name: 'collapsible-code',
    root(root) {
      if (this.pre.tagName !== 'pre') return;
      if (this.source.trimStart().startsWith('infographic ')) return;
      const collapsible = this.source.replace(/\n$/, '').split('\n').length > COLLAPSE_LINE_THRESHOLD;

      const preIndex = root.children.indexOf(this.pre);
      if (preIndex === -1) return;

      const wrapper: Element = {
        type: 'element',
        tagName: 'div',
        properties: { class: collapsible ? 'code-block-wrapper code-collapsible code-collapsed' : 'code-block-wrapper' },
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

      const title = this.pre.properties['data-title'];
      const url = this.pre.properties['data-url'];
      if (title || url) {
        const placeholder: Element = {
          type: 'element',
          tagName: 'div',
          properties: { class: 'code-block-title code-block-title-placeholder', 'aria-hidden': 'true' },
          children: [],
        };
        if (title) {
          placeholder.children.push({
            type: 'element',
            tagName: 'span',
            properties: {},
            children: [{ type: 'text', value: String(title) }],
          });
        }
        if (url) {
          placeholder.children.push({
            type: 'element',
            tagName: 'span',
            properties: { class: 'code-block-title-link' },
            children: [{ type: 'text', value: String(this.pre.properties['data-link-text'] || url) }],
          });
        }
        wrapper.children.splice(1, 0, placeholder);
      }

      root.children[preIndex] = wrapper;
    },
  };
}
