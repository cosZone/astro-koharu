/**
 * CMS Write API Handler
 *
 * Writes frontmatter and content to a blog post file.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { isValid, parse, parseISO } from 'date-fns';
import matter from 'gray-matter';
import type { Context } from 'hono';
import yaml from 'js-yaml';
import { z } from 'zod';
import { addCategoryMappings } from '@/lib/config';
import { serializeFrontmatter } from '@/lib/frontmatter';
import { CONTENT_DIR } from '@/lib/paths';
import { hasValidMarkdownExtension, isPathSafe } from '@/lib/validation';
import type { BlogSchema } from '@/types';

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
    // Frontend now sends local time strings in "yyyy-MM-dd HH:mm:ss" format
    // This preserves user's intended time without UTC conversion issues
    const processedFrontmatter: Record<string, unknown> = { ...frontmatter };

    for (const key of ['date', 'updated'] as const) {
      const dateStr = processedFrontmatter[key];
      if (typeof dateStr === 'string' && dateStr.trim()) {
        // Primary: local time format "yyyy-MM-dd HH:mm:ss"
        const localDate = parse(dateStr, 'yyyy-MM-dd HH:mm:ss', new Date());
        if (isValid(localDate)) {
          processedFrontmatter[key] = localDate;
          continue;
        }

        // Fallback: ISO format for backwards compatibility
        if (dateStr.includes('T')) {
          const isoDate = parseISO(dateStr);
          if (isValid(isoDate)) {
            processedFrontmatter[key] = isoDate;
            continue;
          }
        }

        // Neither format worked - this is an error
        const fieldName = key === 'date' ? 'date' : 'updated';
        console.error(`[write-api] Failed to parse ${fieldName}: "${dateStr}"`);
        return c.json(
          {
            error: `Invalid ${fieldName} format: "${dateStr}". Expected "yyyy-MM-dd HH:mm:ss" or ISO format.`,
          },
          400,
        );
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
