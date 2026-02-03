/**
 * CMS List API Handler
 *
 * Lists all blog posts with metadata and statistics.
 * Supports filtering by category, tag, status, and search.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { isValid, parse, parseISO } from 'date-fns';
import matter from 'gray-matter';
import type { Context } from 'hono';
import yaml from 'js-yaml';
import { CONTENT_DIR, RECENT_POSTS_COUNT } from '@/lib/paths';
import type { DashboardStats, ListPostsResponse, PostListItem } from '@/types';

/**
 * Recursively reads all markdown files from a directory
 */
async function getAllMarkdownFiles(dir: string, baseDir: string = dir): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await getAllMarkdownFiles(fullPath, baseDir);
      files.push(...subFiles);
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
      // Get relative path from base content dir
      const relativePath = path.relative(baseDir, fullPath);
      files.push(relativePath);
    }
  }

  return files;
}

/**
 * Extracts category names from frontmatter categories
 * Handles both flat ['A', 'B'] and nested [['A', 'B']] formats
 */
function extractCategoryNames(categories?: string | string[] | string[][]): string[] {
  if (!categories) return [];

  if (typeof categories === 'string') {
    return [categories];
  }

  const names: string[] = [];
  for (const cat of categories) {
    if (Array.isArray(cat)) {
      names.push(...cat);
    } else {
      names.push(cat);
    }
  }
  return [...new Set(names)];
}

/**
 * Parses a date string in "YYYY-MM-DD HH:mm:ss" format as local time
 * Also supports ISO 8601 format for backward compatibility with existing files
 *
 * Order matters: local time format is tried first to avoid UTC misinterpretation
 * (new Date("2026-01-29 10:00:00") would parse as UTC, not local time)
 */
function parseLocalDate(dateStr: string | Date | undefined): string {
  if (!dateStr) return new Date().toISOString();
  if (dateStr instanceof Date) return dateStr.toISOString();

  // Primary: local time format "yyyy-MM-dd HH:mm:ss"
  // Must be tried FIRST because new Date() would incorrectly parse this as UTC
  const localDate = parse(dateStr, 'yyyy-MM-dd HH:mm:ss', new Date());
  if (isValid(localDate)) {
    return localDate.toISOString();
  }

  // Fallback: ISO 8601 format (contains "T")
  if (dateStr.includes('T')) {
    const isoDate = parseISO(dateStr);
    if (isValid(isoDate)) {
      return isoDate.toISOString();
    }
  }

  // Last resort: try native Date parsing with warning
  const fallbackDate = new Date(dateStr);
  if (isValid(fallbackDate)) {
    console.warn(`[CMS List API] Ambiguous date format: "${dateStr}", using native parsing`);
    return fallbackDate.toISOString();
  }

  // Invalid date - return current time
  console.error(`[CMS List API] Invalid date format: "${dateStr}"`);
  return new Date().toISOString();
}

/**
 * Converts a post file to PostListItem
 */
async function parsePostFile(filePath: string, contentDir: string): Promise<PostListItem | null> {
  try {
    const fullPath = path.join(contentDir, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');

    // Use JSON_SCHEMA to prevent js-yaml from auto-converting dates to UTC
    const { data } = matter(content, {
      engines: {
        yaml: {
          parse: (str) => yaml.load(str, { schema: yaml.JSON_SCHEMA }) as object,
          stringify: (obj) => yaml.dump(obj),
        },
      },
    });

    const slug = filePath.replace(/\.(md|mdx)$/, '');
    const categories = extractCategoryNames(data.categories);
    const tags = Array.isArray(data.tags) ? data.tags : [];

    return {
      id: filePath,
      slug,
      title: data.title || slug,
      date: parseLocalDate(data.date),
      updated: data.updated ? parseLocalDate(data.updated) : undefined,
      categories,
      tags,
      draft: data.draft === true,
      sticky: data.sticky === true,
    };
  } catch (error) {
    console.error(`[CMS List API] Error parsing ${filePath}:`, error);
    return null;
  }
}

/**
 * Filters posts based on query parameters
 */
function filterPosts(
  posts: PostListItem[],
  params: { category?: string; tag?: string; status?: string; search?: string },
): PostListItem[] {
  let filtered = posts;

  const { category, tag, status, search } = params;

  if (category) {
    filtered = filtered.filter((post) => post.categories.includes(category));
  }

  if (tag) {
    filtered = filtered.filter((post) => post.tags.includes(tag));
  }

  if (status === 'draft') {
    filtered = filtered.filter((post) => post.draft);
  } else if (status === 'published') {
    filtered = filtered.filter((post) => !post.draft);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter((post) => post.title.toLowerCase().includes(searchLower));
  }

  return filtered;
}

/**
 * Sorts posts based on sort and order parameters
 */
function sortPosts(posts: PostListItem[], sort: string, order: string): PostListItem[] {
  const sorted = [...posts];
  const ascending = order === 'asc';

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sort) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'updated':
        comparison = new Date(a.updated || a.date).getTime() - new Date(b.updated || b.date).getTime();
        break;
      default:
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
    }

    return ascending ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Calculates statistics from all posts
 */
function calculateStats(posts: PostListItem[]): DashboardStats {
  const categoryCount = new Map<string, number>();
  const tagCount = new Map<string, number>();

  let published = 0;
  let draft = 0;

  for (const post of posts) {
    if (post.draft) {
      draft++;
    } else {
      published++;
    }

    for (const cat of post.categories) {
      categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
    }

    for (const tag of post.tags) {
      tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
    }
  }

  const categoryStats = Array.from(categoryCount.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const tagStats = Array.from(tagCount.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Recent posts: sort by updated/date descending
  const recentPosts = [...posts]
    .sort((a, b) => {
      const dateA = new Date(a.updated || a.date).getTime();
      const dateB = new Date(b.updated || b.date).getTime();
      return dateB - dateA;
    })
    .slice(0, RECENT_POSTS_COUNT);

  return {
    total: posts.length,
    published,
    draft,
    categoryStats,
    tagStats,
    recentPosts,
  };
}

/**
 * GET /api/cms/list
 *
 * Query parameters:
 * - category: Filter by category name
 * - tag: Filter by tag
 * - status: 'all' | 'draft' | 'published'
 * - search: Search in title
 * - sort: 'date' | 'title' | 'updated'
 * - order: 'asc' | 'desc'
 */
export async function listHandler(c: Context) {
  const projectRoot = c.get('projectRoot') as string;

  try {
    const contentDir = path.join(projectRoot, CONTENT_DIR);

    // Get all markdown files
    const files = await getAllMarkdownFiles(contentDir);

    // Parse all files
    const postPromises = files.map((file) => parsePostFile(file, contentDir));
    const parsedPosts = await Promise.all(postPromises);
    const allPosts = parsedPosts.filter((post): post is PostListItem => post !== null);

    // Calculate stats from all posts
    const stats = calculateStats(allPosts);

    // Get all unique categories and tags for filters
    const allCategories = [...new Set(allPosts.flatMap((p) => p.categories))].sort();
    const allTags = [...new Set(allPosts.flatMap((p) => p.tags))].sort();

    // Apply filters
    const filterParams = {
      category: c.req.query('category') || undefined,
      tag: c.req.query('tag') || undefined,
      status: c.req.query('status') || undefined,
      search: c.req.query('search') || undefined,
    };
    let filteredPosts = filterPosts(allPosts, filterParams);

    // Apply sorting
    const sort = c.req.query('sort') || 'date';
    const order = c.req.query('order') || 'desc';
    filteredPosts = sortPosts(filteredPosts, sort, order);

    const response: ListPostsResponse = {
      posts: filteredPosts,
      total: filteredPosts.length,
      stats,
      categories: allCategories,
      tags: allTags,
    };

    return c.json(response);
  } catch (error) {
    console.error('[CMS List API] Error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}
