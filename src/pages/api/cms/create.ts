/**
 * CMS Create API Endpoint
 *
 * Creates a new blog post file with initial frontmatter.
 * Only accessible in development mode when CMS is enabled.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { categoryMap } from '@constants/category';
import { CONTENT_DIR } from '@constants/cms';
import { isPathSafe } from '@lib/cms';
import { jsonErrorResponse, jsonResponse, validateCmsAccess } from '@lib/cms/guard';
import { generateSlug } from '@lib/slug';
import type { APIRoute } from 'astro';
import { format } from 'date-fns';
import yaml from 'js-yaml';

export const prerender = false;

// Config file path
const CONFIG_PATH = 'config/site.yaml';

interface CreatePostParams {
  title: string;
  categories?: string[];
  tags?: string[];
  draft?: boolean;
  categoryMappings?: Record<string, string>;
}

interface CreatePostResponse {
  success: boolean;
  postId: string;
  message?: string;
}

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
  const existingCategoryMap = (config.categoryMap as Record<string, string>) || {};

  // Add new mappings
  for (const [name, slug] of Object.entries(mappings)) {
    existingCategoryMap[name] = slug;
  }

  // Update config
  config.categoryMap = existingCategoryMap;

  // Serialize back to YAML with targeted replacement to preserve comments
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
 * Generates the file path based on categories
 * e.g., ['笔记', '前端'] + 'React Hooks' => 'note/front-end/react-hooks.md'
 */
function generateFilePath(title: string, categories?: string[], customMappings?: Record<string, string>): string {
  const slug = generateSlug(title);

  if (!categories || categories.length === 0) {
    return `${slug}.md`;
  }

  // Convert category names to slugs using categoryMap + custom mappings
  const pathSegments = categories.map((cat) => {
    // Check custom mappings first (for new categories)
    if (customMappings?.[cat]) {
      return customMappings[cat];
    }
    // Then check existing categoryMap
    const mappedSlug = categoryMap[cat];
    if (mappedSlug) {
      return mappedSlug;
    }
    // Fallback: generate slug from category name
    return generateSlug(cat);
  });

  return `${pathSegments.join('/')}/${slug}.md`;
}

/**
 * Generates initial frontmatter content
 */
function generateFrontmatter(params: CreatePostParams): string {
  const now = new Date();
  const dateStr = format(now, 'yyyy-MM-dd HH:mm:ss');

  const lines: string[] = ['---'];

  // Title
  lines.push(`title: ${params.title}`);

  // Date
  lines.push(`date: ${dateStr}`);

  // Updated
  lines.push(`updated: ${dateStr}`);

  // Categories (as nested array format)
  if (params.categories && params.categories.length > 0) {
    lines.push('categories:');
    lines.push(`  - [${params.categories.join(', ')}]`);
  }

  // Tags
  if (params.tags && params.tags.length > 0) {
    lines.push(`tags: [${params.tags.join(', ')}]`);
  }

  // Draft
  if (params.draft !== false) {
    lines.push('draft: true');
  }

  // Catalog enabled by default
  lines.push('catalog: true');

  lines.push('---');
  lines.push('');
  lines.push('');

  return lines.join('\n');
}

/**
 * POST /api/cms/create
 *
 * Request body:
 * {
 *   title: string,
 *   categories?: string[],
 *   tags?: string[],
 *   draft?: boolean
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   postId: string
 * }
 */
export const POST: APIRoute = async ({ request }) => {
  // Security: Validate CMS access
  const guardError = validateCmsAccess();
  if (guardError) {
    return jsonErrorResponse(guardError.error, guardError.status);
  }

  try {
    const body = (await request.json()) as CreatePostParams;

    if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
      return jsonErrorResponse('Title is required', 400);
    }

    const title = body.title.trim();
    const categories = Array.isArray(body.categories) ? body.categories : undefined;
    const tags = Array.isArray(body.tags) ? body.tags : undefined;
    const draft = body.draft !== false; // Default to draft
    const customMappings = body.categoryMappings;

    // Generate file path (pass custom mappings for path generation)
    const postId = generateFilePath(title, categories, customMappings);

    // Validate path safety
    if (!isPathSafe(postId)) {
      return jsonErrorResponse('Invalid file path', 400);
    }

    const filePath = path.join(process.cwd(), CONTENT_DIR, postId);

    // Check if file already exists
    try {
      await fs.access(filePath);
      return jsonErrorResponse(`File already exists: ${postId}`, 409);
    } catch {
      // File doesn't exist, good to proceed
    }

    // Ensure directory exists
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });

    // Add new category mappings if provided
    if (customMappings && Object.keys(customMappings).length > 0) {
      await addCategoryMappings(customMappings);
      console.log('[CMS Create API] Added category mappings:', customMappings);
    }

    // Generate frontmatter and write file
    const content = generateFrontmatter({ title, categories, tags, draft });
    await fs.writeFile(filePath, content, 'utf-8');

    const response: CreatePostResponse = {
      success: true,
      postId,
    };

    return jsonResponse(response, 201);
  } catch (error) {
    console.error('[CMS Create API] Error:', error);
    return jsonErrorResponse('Internal server error', 500);
  }
};
