/**
 * Remark plugin that transforms :::encrypted{password="..."} container directives
 * into annotated MDAST nodes. The actual encryption happens later in rehype.
 *
 * This plugin marks the directive with hName/hProperties so the MDAST→HAST
 * conversion produces a <div class="encrypted-block" data-password="..."> element
 * whose children are fully rendered (Shiki, KaTeX, etc.) before encryption.
 */
import type { Root } from 'mdast';
import type { Node } from 'unist';
import { visit } from 'unist-util-visit';

interface ContainerDirective extends Node {
  name: string;
  attributes?: Record<string, string | null | undefined>;
  data?: Record<string, unknown>;
}

export function remarkEncryptedDirective() {
  return (tree: Root) => {
    visit(tree, (node: Node) => {
      if (node.type !== 'containerDirective') return;
      const directive = node as ContainerDirective;
      if (directive.name !== 'encrypted') return;

      const password = directive.attributes?.password;
      if (!password) return;

      directive.data ??= {};
      directive.data.hName = 'div';
      directive.data.hProperties = {
        className: ['encrypted-block'],
        'data-password': password,
      };
    });
  };
}
