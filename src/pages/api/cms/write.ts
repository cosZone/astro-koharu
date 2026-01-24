/**
 * CMS Write API Endpoint
 *
 * Writes frontmatter and content to a blog post file.
 * Only accessible in development mode or when CMS is enabled.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { cmsConfig } from '@constants/site-config';
import type { APIRoute } from 'astro';
import { format } from 'date-fns';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import type { BlogSchema } from '@/types/blog';

export const prerender = false;

// Content directory relative to project root
const CONTENT_DIR = 'src/content/blog';

/**
 * Validates that the requested path is within the content directory
 * to prevent directory traversal attacks
 */
function isPathSafe(postId: string): boolean {
  const normalized = path.normalize(postId);
  return !normalized.includes('..') && !path.isAbsolute(normalized);
}

/**
 * Converts frontmatter dates to YAML-friendly strings
 * Uses YYYY-MM-DD HH:mm:ss format to match existing blog post format
 */
function serializeFrontmatter(frontmatter: BlogSchema): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(frontmatter)) {
    if (value instanceof Date) {
      // Format date as YYYY-MM-DD HH:mm:ss to match existing format
      result[key] = format(value, 'yyyy-MM-dd HH:mm:ss');
    } else if (value !== undefined && value !== null) {
      result[key] = value;
    }
  }

  return result;
}

interface WriteRequestBody {
  postId: string;
  frontmatter: BlogSchema;
  content: string;
}

/**
 * POST /api/cms/write
 *
 * Writes frontmatter and content to a blog post file.
 *
 * Request body:
 * {
 *   postId: string,
 *   frontmatter: BlogSchema,
 *   content: string
 * }
 */
export const POST: APIRoute = async ({ request }) => {
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

  try {
    const body = (await request.json()) as WriteRequestBody;
    const { postId, frontmatter, content } = body;

    if (!postId) {
      return new Response(JSON.stringify({ error: 'Missing postId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!frontmatter || typeof frontmatter !== 'object') {
      return new Response(JSON.stringify({ error: 'Missing frontmatter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (typeof content !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing content' }), {
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

    // Convert dates from strings to Date objects if needed
    const processedFrontmatter = { ...frontmatter };
    if (typeof processedFrontmatter.date === 'string') {
      processedFrontmatter.date = new Date(processedFrontmatter.date);
    }
    if (typeof processedFrontmatter.updated === 'string') {
      processedFrontmatter.updated = new Date(processedFrontmatter.updated);
    }

    // Serialize frontmatter for YAML
    const serializedFrontmatter = serializeFrontmatter(processedFrontmatter);

    // Generate the file content with gray-matter using custom YAML engine
    // flowLevel: 2 ensures nested arrays use flow style [a, b] instead of block style
    const fileContent = matter.stringify(content, serializedFrontmatter, {
      engines: {
        yaml: {
          parse: (input: string) => yaml.load(input) as object,
          stringify: (obj: object) => {
            const yamlStr = yaml.dump(obj, {
              flowLevel: 2, // Arrays at depth 2+ use flow style [a, b]
              lineWidth: -1, // Don't wrap long lines
              quotingType: "'", // Use single quotes when needed
              forceQuotes: false,
            });
            // Remove quotes around date/updated values (YYYY-MM-DD HH:mm:ss format)
            return yamlStr.replace(/^(date|updated): '(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})'$/gm, '$1: $2');
          },
        },
      },
    });

    // Ensure the directory exists
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });

    // Write the file
    await fs.writeFile(filePath, fileContent, 'utf-8');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[CMS Write API] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
