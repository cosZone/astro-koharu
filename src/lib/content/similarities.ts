/**
 * Similarity-based post retrieval utilities
 */

import type { BlogPost } from 'types/blog';

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

  // Fallback: case-insensitive search for backward compatibility
  const lowerSlug = currentSlug.toLowerCase();
  const keys = Object.keys(similarityData);

  for (const key of keys) {
    if (key.toLowerCase() === lowerSlug) {
      return similarityData[key].slice(0, count);
    }
  }

  return [];
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
    const currentSlug = currentPost.data.link ?? currentPost.slug;
    const relatedSlugs = getRelatedPostSlugs(currentSlug, count);

    if (!relatedSlugs.length) {
      return [];
    }

    // Create a map from slug to full post object
    const slugToPost = new Map<string, BlogPost>();
    for (const post of allPosts) {
      const slug = post.data.link ?? post.slug;
      slugToPost.set(slug, post);
    }

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
  return Object.keys(similarityData).length > 0;
}
