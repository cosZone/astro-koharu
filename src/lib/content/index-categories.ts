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

export function categoryTrail(categories: readonly Category[], name: string): string[] {
  for (const category of categories) {
    if (category.name === name) return [name];
    const nested = categoryTrail(category.children ?? [], name);
    if (nested.length) return [category.name, ...nested];
  }
  return [];
}
