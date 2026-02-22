/**
 * Rehype plugin that encrypts entire post content when frontmatter has a `password` field.
 *
 * MUST run as the LAST rehype plugin (after rehypeEncryptedBlock) so that all rendering
 * (Shiki, KaTeX, encrypted blocks, etc.) has already been applied.
 *
 * Flow:
 * 1. Read `password` from file.data.astro.frontmatter
 * 2. If password is present, serialize entire HAST tree to HTML
 * 3. Encrypt the HTML with AES-256-GCM using the password
 * 4. Replace entire tree with a single <div class="encrypted-post" data-cipher/iv/salt>
 * 5. Add data-pagefind-ignore to exclude from search index
 */
import type { Root } from 'hast';
import { toHtml } from 'hast-util-to-html';
import type { VFile } from 'vfile';
import { encryptContent } from '../crypto';

interface AstroFrontmatter {
  password?: string;
}

export function rehypeEncryptedPost() {
  return async (tree: Root, file: VFile) => {
    const frontmatter = (file.data as { astro?: { frontmatter?: AstroFrontmatter } }).astro?.frontmatter;
    if (!frontmatter?.password) return;

    // Serialize the entire tree to HTML
    const html = toHtml(tree, { allowDangerousHtml: true });
    const { cipher, iv, salt } = await encryptContent(html, frontmatter.password);

    // Replace the entire tree with a single encrypted container
    tree.children = [
      {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['encrypted-post'],
          'data-cipher': cipher,
          'data-iv': iv,
          'data-salt': salt,
          'data-pagefind-ignore': '',
        },
        children: [],
      },
    ];
  };
}
