/**
 * CMS Read API Endpoint
 *
 * Reads a blog post file and returns its frontmatter and content.
 * Only accessible in development mode or when CMS is enabled.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { cmsConfig } from '@constants/site-config';
import type { APIRoute } from 'astro';
import matter from 'gray-matter';

// In production, prerender as static (returns 403 anyway)
// In development, use SSR for dynamic API handling
// export const prerender = !import.meta.env.PROD;
export const prerender = false;

// Content directory relative to project root
const CONTENT_DIR = 'src/content/blog';

/**
 * Validates that the requested path is within the content directory
 * to prevent directory traversal attacks
 */
function isPathSafe(postId: string): boolean {
  // Normalize the path and check for directory traversal
  const normalized = path.normalize(postId);
  return !normalized.includes('..') && !path.isAbsolute(normalized);
}

/**
 * GET /api/cms/read?postId=<postId>
 *
 * Returns the frontmatter and content of a blog post file.
 */
export const GET: APIRoute = async ({ url }) => {
  // Security: Only allow in development mode
  if (!import.meta.env.DEV) {
    return new Response(JSON.stringify({ error: 'CMS API is only available in development mode' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Security: Only allow when CMS is enabled
  if (!cmsConfig.enabled) {
    return new Response(JSON.stringify({ error: 'CMS is not enabled' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const postId = url.searchParams.get('postId');

  if (!postId) {
    return new Response(JSON.stringify({ error: 'Missing postId parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate path safety
  if (!isPathSafe(postId)) {
    return new Response(JSON.stringify({ error: 'Invalid postId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Construct the full file path
    const filePath = path.join(process.cwd(), CONTENT_DIR, postId);

    // Ensure the file has .md or .mdx extension
    const ext = path.extname(filePath);
    if (ext !== '.md' && ext !== '.mdx') {
      return new Response(JSON.stringify({ error: 'Invalid file extension' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Read the file
    const fileContent = await fs.readFile(filePath, 'utf-8');

    // Parse frontmatter and content
    const { data: frontmatter, content } = matter(fileContent);

    return new Response(JSON.stringify({ frontmatter, content }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.error('[CMS Read API] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
