/**
 * CMS Toggle Sticky API Handler
 *
 * Toggles the sticky status of a blog post.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import type { Context } from 'hono';
import yaml from 'js-yaml';
import { z } from 'zod';
import { CONTENT_DIR } from '@/lib/paths';
import { hasValidMarkdownExtension, isPathSafe } from '@/lib/validation';
import type { ToggleStickyResponse } from '@/types';

/** Zod schema for toggle sticky request validation */
const toggleStickyRequestSchema = z.object({
  postId: z.string().min(1, 'postId is required'),
});

/**
 * POST /api/cms/toggle-sticky
 *
 * Request body:
 * {
 *   postId: string
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   sticky: boolean
 * }
 */
export async function toggleStickyHandler(c: Context) {
  const projectRoot = c.get('projectRoot') as string;

  try {
    const rawBody = await c.req.json();
    const parseResult = toggleStickyRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ');
      return c.json({ error: errorMessage }, 400);
    }

    const { postId } = parseResult.data;

    // Validate path safety
    if (!isPathSafe(postId)) {
      return c.json({ error: 'Invalid postId' }, 400);
    }

    // Ensure the file has .md or .mdx extension
    if (!hasValidMarkdownExtension(postId)) {
      return c.json({ error: 'Invalid file extension' }, 400);
    }

    const filePath = path.join(projectRoot, CONTENT_DIR, postId);

    // Read the file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    // Use JSON_SCHEMA to prevent js-yaml from auto-converting dates to Date objects
    const { data: frontmatter, content } = matter(fileContent, {
      engines: {
        yaml: {
          parse: (str) => yaml.load(str, { schema: yaml.JSON_SCHEMA }) as object,
          stringify: (obj) => yaml.dump(obj),
        },
      },
    });

    // Toggle sticky status
    const currentSticky = frontmatter.sticky === true;
    const newSticky = !currentSticky;
    frontmatter.sticky = newSticky;

    // Write back using gray-matter with custom YAML engine
    // Note: JSON_SCHEMA keeps dates as strings, so no serialization needed
    const newContent = matter.stringify(content, frontmatter, {
      engines: {
        yaml: {
          parse: (input: string) => yaml.load(input) as object,
          stringify: (obj: object) => {
            const yamlStr = yaml.dump(obj, {
              flowLevel: 2,
              lineWidth: -1,
              quotingType: "'",
              forceQuotes: false,
            });
            // Remove quotes around date/updated values
            return yamlStr.replace(/^(date|updated): '(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})'$/gm, '$1: $2');
          },
        },
      },
    });

    await fs.writeFile(filePath, newContent, 'utf-8');

    const response: ToggleStickyResponse = {
      success: true,
      sticky: newSticky,
    };

    return c.json(response);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return c.json({ error: 'File not found' }, 404);
    }

    console.error('[CMS Toggle Sticky API] Error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}
