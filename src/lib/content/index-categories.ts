import type { Category } from './types';

type CategorizedPost = { data: { categories?: string[] | string[][] } };

/** Match a full ancestry prefix so identically named branches cannot contaminate counts. */
export function postsInCategoryPath<T extends CategorizedPost>(posts: readonly T[], path: readonly string[]): T[] {
  if (!path.length) return [];
  return posts.filter(({ data }) => {
    const first = data.categories?.[0];
    const ancestry = Array.isArray(first) ? first : first ? [first] : [];
    return path.every((name, index) => ancestry[index] === name);
  });
}

/** Resolve each ancestor in order; leaf names alone do not identify a category. */
export function categoryAtPath(categories: readonly Category[], path: readonly string[]): Category | null {
  let siblings = categories;
  let category: Category | undefined;
  for (const name of path) {
    category = siblings.find((candidate) => candidate.name === name);
    if (!category) return null;
    siblings = category.children ?? [];
  }
  return category ?? null;
}
