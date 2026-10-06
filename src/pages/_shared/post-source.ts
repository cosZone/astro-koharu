import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { APIRoute } from 'astro';

/** Serves the post's original Markdown file, frontmatter included. */
export const getPostSource: APIRoute<{ filePath: string }> = async ({ props }) => {
  const source = await readFile(resolve(props.filePath));
  return new Response(source, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
