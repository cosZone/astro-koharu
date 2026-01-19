/**
 * Tag-related utility functions
 */

import type { BlogPost } from 'types/blog';

/**
 * Normalize a tag to lowercase for case-insensitive comparison
 */
export const normalizeTag = (tag: string) => tag.toLowerCase();

/**
 * Convert tag to URL-safe slug
 * Replaces `/` with `-` and encodes special characters
 */
export const tagToSlug = (tag: string) => encodeURIComponent(normalizeTag(tag).replace(/\//g, '-'));

/**
 * Build tag URL path
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
