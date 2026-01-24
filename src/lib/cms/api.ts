/**
 * CMS API Client
 *
 * Client-side functions for reading and writing blog posts via the CMS API.
 */

import type { BlogSchema } from '@/types/blog';

export interface ReadPostResult {
  frontmatter: BlogSchema;
  content: string;
}

/**
 * Reads a blog post from the CMS API
 *
 * @param postId - The post ID (e.g., 'note/front-end/theme.md')
 * @returns The frontmatter and content of the post
 * @throws Error if the request fails
 */
export async function readPost(postId: string): Promise<ReadPostResult> {
  const response = await fetch(`/api/cms/read?postId=${encodeURIComponent(postId)}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to read post: ${response.status}`);
  }

  const data = await response.json();

  // Convert date strings back to Date objects
  if (data.frontmatter.date) {
    data.frontmatter.date = new Date(data.frontmatter.date);
  }
  if (data.frontmatter.updated) {
    data.frontmatter.updated = new Date(data.frontmatter.updated);
  }

  return data as ReadPostResult;
}

/**
 * Writes a blog post via the CMS API
 *
 * @param postId - The post ID (e.g., 'note/front-end/theme.md')
 * @param frontmatter - The post frontmatter
 * @param content - The post content (markdown)
 * @param categoryMappings - Optional new category mappings to add to config/site.yaml
 * @throws Error if the request fails
 */
export async function writePost(
  postId: string,
  frontmatter: BlogSchema,
  content: string,
  categoryMappings?: Record<string, string>,
): Promise<void> {
  const response = await fetch('/api/cms/write', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      postId,
      frontmatter,
      content,
      categoryMappings,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to write post: ${response.status}`);
  }
}
