/**
 * CMS Read API Handler
 *
 * Reads a blog post file and returns its frontmatter and content.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import type { Context } from 'hono';
import yaml from 'js-yaml';
import { CONTENT_DIR } from '@/lib/paths';
import { hasValidMarkdownExtension, isPathSafe } from '@/lib/validation';

/**
 * GET /api/cms/read?postId=<postId>
 *
 * Returns the frontmatter and content of a blog post file.
 */
export async function readHandler(c: Context) {
  const projectRoot = c.get('projectRoot') as string;
  const postId = c.req.query('postId');

  if (!postId) {
    return c.json({ error: 'Missing postId parameter' }, 400);
  }

  // Validate path safety
  if (!isPathSafe(postId)) {
    return c.json({ error: 'Invalid postId' }, 400);
  }

  // Ensure the file has .md or .mdx extension
  if (!hasValidMarkdownExtension(postId)) {
    return c.json({ error: 'Invalid file extension' }, 400);
  }

  try {
    // Construct the full file path
    const filePath = path.join(projectRoot, CONTENT_DIR, postId);

    // Read the file
    const fileContent = await fs.readFile(filePath, 'utf-8');

    // Parse frontmatter and content
    // Use JSON_SCHEMA to prevent js-yaml from auto-parsing dates as UTC
    // This keeps dates as strings (e.g., "2026-01-03 20:00:00") to preserve local time semantics
    const { data: frontmatter, content } = matter(fileContent, {
      engines: {
        yaml: {
          parse: (str) => yaml.load(str, { schema: yaml.JSON_SCHEMA }) as object,
          stringify: (obj) => yaml.dump(obj),
        },
      },
    });

    return c.json({ frontmatter, content });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return c.json({ error: 'File not found' }, 404);
    }

    console.error('[CMS Read API] Error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}
