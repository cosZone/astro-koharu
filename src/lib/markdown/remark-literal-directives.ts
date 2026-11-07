import type { Root, Text } from 'mdast';
import type { Node } from 'unist';
import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';

type DirectiveNode = Node & {
  name?: string;
  position?: {
    start: { offset?: number };
    end: { offset?: number };
  };
};

/** Keep ordinary colon text literal when remark-directive is enabled for encrypted blocks. */
export function remarkLiteralDirectives() {
  return (tree: Root, file: VFile) => {
    const source = String(file.value);
    visit(tree, (node, index, parent) => {
      if (index === undefined || !parent) return;
      if (!['textDirective', 'leafDirective', 'containerDirective'].includes(node.type)) return;
      const directive = node as DirectiveNode;
      if (node.type === 'containerDirective' && directive.name === 'encrypted') return;

      const start = directive.position?.start.offset;
      const end = directive.position?.end.offset;
      if (start === undefined || end === undefined) return;

      const literal: Text = { type: 'text', value: source.slice(start, end), position: directive.position };
      parent.children[index] = literal;
    });
  };
}
