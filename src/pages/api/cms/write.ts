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
  categoryMappings?: Record<string, string>;
}

// Config file path
const CONFIG_PATH = 'config/site.yaml';

/**
 * Adds new category mappings to config/site.yaml
 * Preserves the existing file structure and adds to the categoryMap section
 */
async function addCategoryMappings(mappings: Record<string, string>): Promise<void> {
  const configPath = path.join(process.cwd(), CONFIG_PATH);
  const content = await fs.readFile(configPath, 'utf-8');

  // Parse YAML
  const config = yaml.load(content) as Record<string, unknown>;

  // Get or create categoryMap
  const categoryMap = (config.categoryMap as Record<string, string>) || {};

  // Add new mappings
  for (const [name, slug] of Object.entries(mappings)) {
    categoryMap[name] = slug;
  }

  // Update config
  config.categoryMap = categoryMap;

  // Serialize back to YAML
  // We need to preserve comments, so we'll do a targeted replacement instead
  // Find the categoryMap section and add entries there
  const lines = content.split('\n');
  const newLines: string[] = [];
  let inCategoryMap = false;
  let categoryMapIndent = '';
  let insertedMappings = false;

  for (const line of lines) {
    // Check if we're entering categoryMap section
    if (/^categoryMap:\s*$/.test(line)) {
      inCategoryMap = true;
      newLines.push(line);
      continue;
    }

    // Check if we're leaving categoryMap section (new top-level key)
    if (inCategoryMap && /^[a-zA-Z]/.test(line) && !line.startsWith(' ') && !line.startsWith('#')) {
      // Insert new mappings before leaving
      if (!insertedMappings) {
        for (const [name, slug] of Object.entries(mappings)) {
          newLines.push(`${categoryMapIndent}${name}: ${slug}`);
        }
        insertedMappings = true;
      }
      inCategoryMap = false;
    }

    // Get indent level for categoryMap entries
    if (inCategoryMap && /^\s+\S/.test(line) && !categoryMapIndent) {
      const match = line.match(/^(\s+)/);
      if (match) {
        categoryMapIndent = match[1];
      }
    }

    newLines.push(line);
  }

  // If we never left categoryMap (it's at the end), insert now
  if (inCategoryMap && !insertedMappings) {
    for (const [name, slug] of Object.entries(mappings)) {
      newLines.push(`${categoryMapIndent}${name}: ${slug}`);
    }
  }

  await fs.writeFile(configPath, newLines.join('\n'), 'utf-8');
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
    const { postId, frontmatter, content, categoryMappings } = body;

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

    // Add new category mappings if provided
    if (categoryMappings && Object.keys(categoryMappings).length > 0) {
      await addCategoryMappings(categoryMappings);
      console.log('[CMS Write API] Added category mappings:', categoryMappings);
    }

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
