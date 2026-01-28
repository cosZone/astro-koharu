/**
 * CMS API Client
 *
 * Client-side functions for reading and writing blog posts via the CMS API.
 */

import { parse } from 'date-fns';
import type { BlogSchema } from '@/types/blog';

// =============================================================================
// Types
// =============================================================================

export interface ReadPostResult {
  frontmatter: BlogSchema;
  content: string;
}

export interface PostListItem {
  id: string;
  slug: string;
  title: string;
  date: string;
  updated?: string;
  categories: string[];
  tags: string[];
  draft: boolean;
  sticky: boolean;
}

export interface DashboardStats {
  total: number;
  published: number;
  draft: number;
  categoryStats: { name: string; count: number }[];
  tagStats: { name: string; count: number }[];
  recentPosts: PostListItem[];
}

export interface ListPostsResponse {
  posts: PostListItem[];
  total: number;
  stats: DashboardStats;
  categories: string[];
  tags: string[];
}

export interface ListPostsParams {
  category?: string;
  tag?: string;
  status?: 'all' | 'draft' | 'published';
  search?: string;
  sort?: 'date' | 'title' | 'updated';
  order?: 'asc' | 'desc';
}

export interface CreatePostParams {
  title: string;
  categories?: string[];
  tags?: string[];
  draft?: boolean;
  categoryMappings?: Record<string, string>;
}

export interface CreatePostResponse {
  success: boolean;
  postId: string;
}

export interface ToggleDraftResponse {
  success: boolean;
  draft: boolean;
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

  // Convert date strings to Date objects
  // Use date-fns parse() to interpret strings as local time, not UTC
  // This avoids timezone shifts when reading dates like "2026-01-03 20:00:00"
  if (data.frontmatter.date && typeof data.frontmatter.date === 'string') {
    data.frontmatter.date = parse(data.frontmatter.date, 'yyyy-MM-dd HH:mm:ss', new Date());
  }
  if (data.frontmatter.updated && typeof data.frontmatter.updated === 'string') {
    data.frontmatter.updated = parse(data.frontmatter.updated, 'yyyy-MM-dd HH:mm:ss', new Date());
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

// =============================================================================
// Dashboard API Functions
// =============================================================================

/**
 * Lists all blog posts with metadata and statistics
 *
 * @param params - Optional filter/sort parameters
 * @returns Posts list with statistics
 */
export async function listPosts(params?: ListPostsParams): Promise<ListPostsResponse> {
  const searchParams = new URLSearchParams();

  if (params?.category) searchParams.set('category', params.category);
  if (params?.tag) searchParams.set('tag', params.tag);
  if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.sort) searchParams.set('sort', params.sort);
  if (params?.order) searchParams.set('order', params.order);

  const queryString = searchParams.toString();
  const url = `/api/cms/list${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to list posts: ${response.status}`);
  }

  return response.json();
}

/**
 * Creates a new blog post
 *
 * @param params - Post creation parameters
 * @returns The created post ID
 */
export async function createPost(params: CreatePostParams): Promise<CreatePostResponse> {
  const response = await fetch('/api/cms/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to create post: ${response.status}`);
  }

  return response.json();
}

/**
 * Toggles the draft status of a post
 *
 * @param postId - The post ID (file path)
 * @returns The new draft status
 */
export async function toggleDraft(postId: string): Promise<ToggleDraftResponse> {
  const response = await fetch('/api/cms/toggle-draft', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ postId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to toggle draft: ${response.status}`);
  }

  return response.json();
}
