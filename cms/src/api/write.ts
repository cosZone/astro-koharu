/**
 * CMS Write API Handler
 *
 * Writes frontmatter and content to a blog post file.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { format, parse, parseISO } from 'date-fns';
import matter from 'gray-matter';
import type { Context } from 'hono';
import yaml from 'js-yaml';
import { z } from 'zod';
import { addCategoryMappings } from '@/lib/config';
import { CONTENT_DIR } from '@/lib/paths';
import { hasValidMarkdownExtension, isPathSafe } from '@/lib/validation';
import type { BlogSchema } from '@/types';

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

/** Zod schema for write post request validation */
const writePostRequestSchema = z.object({
  postId: z.string().min(1, 'postId is required'),
  frontmatter: z.record(z.unknown()),
  content: z.string(),
  categoryMappings: z.record(z.string(), z.string()).optional(),
});

/**
 * POST /api/cms/write
 *
 * Writes frontmatter and content to a blog post file.
 */
export async function writeHandler(c: Context) {
  const projectRoot = c.get('projectRoot') as string;

  try {
    const rawBody = await c.req.json();
    const parseResult = writePostRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ');
      return c.json({ error: errorMessage }, 400);
    }

    const { postId, frontmatter, content, categoryMappings } = parseResult.data;

    // Validate path safety
    if (!isPathSafe(postId)) {
      return c.json({ error: 'Invalid postId' }, 400);
    }

    // Ensure the file has .md or .mdx extension
    if (!hasValidMarkdownExtension(postId)) {
      return c.json({ error: 'Invalid file extension' }, 400);
    }

    // Construct the full file path
    const filePath = path.join(projectRoot, CONTENT_DIR, postId);

    // Convert date strings to Date objects
    // Frontend sends ISO strings (e.g., "2026-01-03T12:00:00.000Z") via JSON.stringify
    // We parse these to Date objects for proper local time formatting
    const processedFrontmatter: Record<string, unknown> = { ...frontmatter };
    const dateStr = processedFrontmatter.date;
    if (typeof dateStr === 'string') {
      // ISO format (with 'T' and 'Z') from JSON.stringify
      if (dateStr.includes('T')) {
        processedFrontmatter.date = parseISO(dateStr);
      } else {
        // Local time format (e.g., "2026-01-03 20:00:00")
        processedFrontmatter.date = parse(dateStr, 'yyyy-MM-dd HH:mm:ss', new Date());
      }
    }
    const updatedStr = processedFrontmatter.updated;
    if (typeof updatedStr === 'string') {
      if (updatedStr.includes('T')) {
        processedFrontmatter.updated = parseISO(updatedStr);
      } else {
        processedFrontmatter.updated = parse(updatedStr, 'yyyy-MM-dd HH:mm:ss', new Date());
      }
    }

    // Serialize frontmatter for YAML
    const serializedFrontmatter = serializeFrontmatter(processedFrontmatter as unknown as BlogSchema);

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
      await addCategoryMappings(projectRoot, categoryMappings);
    }

    // Ensure the directory exists
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });

    // Write the file
    await fs.writeFile(filePath, fileContent, 'utf-8');

    return c.json({ success: true });
  } catch (error) {
    console.error('[CMS Write API] Error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}
