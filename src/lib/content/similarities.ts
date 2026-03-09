/**
 * Similarity-based post retrieval utilities
 */

import type { BlogPost } from 'types/blog';
import { getPostSlug } from './locale';

/** WeakMap cache: reuse slug→post Map when the same allPosts array reference is passed */
const slugToPostCache = new WeakMap<BlogPost[], Map<string, BlogPost>>();

function getSlugToPostMap(allPosts: BlogPost[]): Map<string, BlogPost> {
  let map = slugToPostCache.get(allPosts);
  if (!map) {
    map = new Map();
    for (const post of allPosts) {
      map.set(getPostSlug(post), post);
    }
    slugToPostCache.set(allPosts, map);
  }
  return map;
}

interface SimilarPost {
  slug: string;
  title: string;
  similarity: number;
}

type SimilarityMap = Record<string, SimilarPost[]>;

// Load similarity data (generated at build time)
let similarityData: SimilarityMap = {};

try {
  // Dynamic import to handle missing file gracefully
  const data = await import('@assets/similarities.json');
  similarityData = data.default as SimilarityMap;
} catch {
  // File doesn't exist yet or failed to load
  console.warn('similarities.json not found. Run `pnpm generate:similarities` to generate it.');
}

/** Pre-built lowercase slug → original key map for O(1) case-insensitive fallback */
const similarityLowerMap = new Map<string, string>();
for (const key of Object.keys(similarityData)) {
  similarityLowerMap.set(key.toLowerCase(), key);
}

const _hasSimilarityData = similarityLowerMap.size > 0;

/**
 * Get related post slugs for a given post
 * @param currentSlug Current post's slug (from post.data.link or post.slug)
 * @param count Number of related posts to return
 * @returns Array of similar post data with similarity scores
 */
export function getRelatedPostSlugs(currentSlug: string, count: number = 5): SimilarPost[] {
  // Fast path: exact match (O(1))
  const exactMatch = similarityData[currentSlug];
  if (exactMatch) {
    return exactMatch.slice(0, count);
  }

  // Fallback: case-insensitive lookup via pre-built map
  const originalKey = similarityLowerMap.get(currentSlug.toLowerCase());
  return originalKey ? similarityData[originalKey].slice(0, count) : [];
}

/**
 * Get related posts with full post data
 * @param currentPost Current post
 * @param allPosts All available posts
 * @param count Number of related posts to return
 * @returns Array of BlogPost objects sorted by similarity
 */
export function getRelatedPosts(currentPost: BlogPost, allPosts: BlogPost[], count: number = 5): BlogPost[] {
  try {
    const currentSlug = getPostSlug(currentPost);
    const relatedSlugs = getRelatedPostSlugs(currentSlug, count);

    if (!relatedSlugs.length) {
      return [];
    }

    // Reuse cached slug→post map (built once per allPosts reference)
    const slugToPost = getSlugToPostMap(allPosts);

    // Map related slugs to full posts, maintaining similarity order
    const relatedPosts: BlogPost[] = [];
    for (const { slug } of relatedSlugs) {
      const post = slugToPost.get(slug);
      if (post) {
        relatedPosts.push(post);
      }
    }

    return relatedPosts;
  } catch (error) {
    console.warn('Failed to get related posts:', error);
    return [];
  }
}

/**
 * Check if similarity data is available
 */
export function hasSimilarityData(): boolean {
  return _hasSimilarityData;
}
