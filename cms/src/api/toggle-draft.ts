/**
 * CMS Toggle Draft API Handler
 *
 * Toggles the draft status of a blog post.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import type { Context } from 'hono';
import yaml from 'js-yaml';
import { z } from 'zod';
import { CONTENT_DIR } from '@/lib/paths';
import { hasValidMarkdownExtension, isPathSafe } from '@/lib/validation';
import type { ToggleDraftResponse } from '@/types';

/** Zod schema for toggle draft request validation */
const toggleDraftRequestSchema = z.object({
  postId: z.string().min(1, 'postId is required'),
});

/**
 * POST /api/cms/toggle-draft
 *
 * Request body:
 * {
 *   postId: string
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   draft: boolean
 * }
 */
export async function toggleDraftHandler(c: Context) {
  const projectRoot = c.get('projectRoot') as string;

  try {
    const rawBody = await c.req.json();
    const parseResult = toggleDraftRequestSchema.safeParse(rawBody);

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

    // Toggle draft status
    const currentDraft = frontmatter.draft === true;
    const newDraft = !currentDraft;
    frontmatter.draft = newDraft;

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

    const response: ToggleDraftResponse = {
      success: true,
      draft: newDraft,
    };

    return c.json(response);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return c.json({ error: 'File not found' }, 404);
    }

    console.error('[CMS Toggle Draft API] Error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}
