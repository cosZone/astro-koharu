/**
 * Rehype plugin that encrypts the content of .encrypted-block elements.
 *
 * MUST run as the LAST rehype plugin so that all rendering (Shiki, KaTeX, etc.)
 * has already been applied to the children.
 *
 * Flow:
 * 1. Find <div class="encrypted-block" data-password="..."> elements
 * 2. Serialize children to HTML string via hast-util-to-html
 * 3. Encrypt HTML with AES-256-GCM using the password
 * 4. Replace children with empty, add data-cipher/data-iv/data-salt attributes
 * 5. Remove data-password (password must not appear in final HTML)
 * 6. Add data-pagefind-ignore to exclude from search index
 */
import type { Element, Root } from 'hast';
import { toHtml } from 'hast-util-to-html';
import { visit } from 'unist-util-visit';
import { encryptContent } from '../crypto';

export function rehypeEncryptedBlock() {
  return async (tree: Root) => {
    const tasks: { node: Element }[] = [];

    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'div') return;
      const classNames = node.properties?.className;
      if (!Array.isArray(classNames) || !classNames.includes('encrypted-block')) return;
      if (!node.properties?.['data-password']) return;
      tasks.push({ node });
    });

    await Promise.all(
      tasks.map(async ({ node }) => {
        const password = String(node.properties['data-password']);
        const html = toHtml({ type: 'root', children: node.children });
        const { cipher, iv, salt } = await encryptContent(html, password);

        // Replace children with empty
        node.children = [];

        // Set encrypted data attributes
        node.properties['data-cipher'] = cipher;
        node.properties['data-iv'] = iv;
        node.properties['data-salt'] = salt;

        // Remove password from final HTML
        delete node.properties['data-password'];

        // Exclude from Pagefind search index
        node.properties['data-pagefind-ignore'] = '';
      }),
    );
  };
}
