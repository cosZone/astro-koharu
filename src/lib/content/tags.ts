/**
 * Tag-related utility functions
 */

import type { BlogPost } from 'types/blog';
import { encodeSlug } from '../route';

/**
 * Normalize a tag to lowercase for case-insensitive comparison
 */
export const normalizeTag = (tag: string) => tag.toLowerCase();

/**
 * Convert tag to URL-safe slug
 * Replaces `/` with `-` for filesystem compatibility
 */
export const tagToSlug = (tag: string) => encodeSlug(normalizeTag(tag).replace(/\//g, '-'));

/**
 * Build tag URL path, eg. C# -> /tags/c%23
 * @param tag Tag name
 * @returns URL path like "/tags/c%23"
 */
export const buildTagPath = (tag: string) => `/tags/${tagToSlug(tag)}`;

/**
 * Get all tags with their counts (case-insensitive)
 */
export const getAllTags = (posts: BlogPost[]) => {
  return posts.reduce<Record<string, number>>((acc, post) => {
    const postTags = post.data.tags || [];
    postTags.forEach((tag: string) => {
      const normalized = normalizeTag(tag);
      if (!acc[normalized]) {
        acc[normalized] = 0;
      }
      acc[normalized]++;
    });
    return acc;
  }, {});
};
