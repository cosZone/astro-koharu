/**
 * CMS Toggle Draft API Endpoint
 *
 * Toggles the draft status of a blog post.
 * Only accessible in development mode when CMS is enabled.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { CONTENT_DIR } from '@constants/cms';
import { hasValidMarkdownExtension, isPathSafe } from '@lib/cms';
import { jsonErrorResponse, jsonResponse, validateCmsAccess } from '@lib/cms/guard';
import type { APIRoute } from 'astro';
import matter from 'gray-matter';
import yaml from 'js-yaml';

export const prerender = false;

interface ToggleDraftRequest {
  postId: string;
}

interface ToggleDraftResponse {
  success: boolean;
  draft: boolean;
}

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
export const POST: APIRoute = async ({ request }) => {
  // Security: Validate CMS access
  const guardError = validateCmsAccess();
  if (guardError) {
    return jsonErrorResponse(guardError.error, guardError.status);
  }

  try {
    const body = (await request.json()) as ToggleDraftRequest;
    const { postId } = body;

    if (!postId || typeof postId !== 'string') {
      return jsonErrorResponse('Missing postId', 400);
    }

    // Validate path safety
    if (!isPathSafe(postId)) {
      return jsonErrorResponse('Invalid postId', 400);
    }

    // Ensure the file has .md or .mdx extension
    if (!hasValidMarkdownExtension(postId)) {
      return jsonErrorResponse('Invalid file extension', 400);
    }

    const filePath = path.join(process.cwd(), CONTENT_DIR, postId);

    // Read the file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(fileContent);

    // Toggle draft status
    const currentDraft = frontmatter.draft === true;
    const newDraft = !currentDraft;
    frontmatter.draft = newDraft;

    // Write back using gray-matter with custom YAML engine
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

    return jsonResponse(response);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return jsonErrorResponse('File not found', 404);
    }

    console.error('[CMS Toggle Draft API] Error:', error);
    return jsonErrorResponse('Internal server error', 500);
  }
};
