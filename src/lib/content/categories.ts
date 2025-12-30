/**
 * Category-related utility functions
 */

import { getCollection } from 'astro:content';
import { categoryMap } from '@constants/category';

import type { Category, CategoryListResult } from './types';

/**
 * Get hierarchical category list with counts (excluding drafts in production)
 */
export async function getCategoryList(): Promise<CategoryListResult> {
  const allBlogPosts = await getCollection('blog', ({ data }) => {
    // 在生产环境中，过滤掉草稿
    return import.meta.env.PROD ? data.draft !== true : true;
  });
  const countMap: { [key: string]: number } = {}; // TODO: 需要优化，应该以分类路径为键名而不是 name 如数据结构既是根分类也是笔记-后端-数据结构。
  const resCategories: Category[] = [];

  // 统计每个分类的直接文章数量
  for (let i = 0; i < allBlogPosts.length; ++i) {
    const post = allBlogPosts[i];
    const { catalog, categories } = post.data;
    if (!catalog || !categories?.length) {
      continue;
    }

    const firstCategory = categories[0];
    if (Array.isArray(firstCategory)) {
      // categories[0] = ['笔记', '算法']
      if (!firstCategory.length) continue;

      for (let j = 0; j < firstCategory.length; ++j) {
        const name = firstCategory[j];
        countMap[name] = (countMap[name] || 0) + 1;
        if (j === 0) {
          addCategoryRecursively(resCategories, [], name);
        } else {
          const parentNames = firstCategory.slice(0, j);
          addCategoryRecursively(resCategories, parentNames, name);
        }
      }
    } else if (typeof firstCategory === 'string') {
      // categories[0] = '工具'
      countMap[firstCategory] = (countMap[firstCategory] || 0) + 1;
      addCategoryRecursively(resCategories, [], firstCategory);
    }
  }

  return { categories: resCategories, countMap };
}

/**
 * 递归添加子分类 有副作用的函数 如 ['分类1', '分类2', '分类3'] 创建一级分类 '分类1'、二级分类 '分类2'、三级分类 '分类3'
 * @param rootCategories 根分类
 * @param parentNames 父分类名 ['分类1', '分类2']
 * @param name 子分类名 '分类3'
 */
export function addCategoryRecursively(rootCategories: Category[], parentNames: string[], name: string) {
  if (parentNames.length === 0) {
    const index = rootCategories.findIndex((c) => c.name === name); // 如果当前分类已存在，则直接返回
    if (index === -1) rootCategories.push({ name });
    return;
  } else {
    const rootParentName = parentNames[0];
    const index = rootCategories.findIndex((c) => c.name === rootParentName);
    if (index === -1) {
      // 如果父级分类不存在，则创建
      const rootParentCategory = { name: rootParentName, children: [] };
      rootCategories.push(rootParentCategory);
      addCategoryRecursively(rootParentCategory.children, parentNames.slice(1), name);
    } else {
      // 如果父级分类存在,找到这个分类
      const rootParentCategory = rootCategories[index];
      if (!rootParentCategory?.children) rootParentCategory.children = [];
      addCategoryRecursively(rootParentCategory.children, parentNames.slice(1), name);
    }
  }
}

/**
 * 获取分类完整链接
 * @param categories 分类
 * @param parentLink 父分类链接
 * @returns 分类链接
 */
export function getCategoryLinks(categories?: Category[], parentLink?: string): string[] {
  if (!categories?.length) return [];
  const res: string[] = [];
  categories.forEach((category: Category) => {
    const link = categoryMap[category.name];
    const fullLink = parentLink ? `${parentLink}/${link}` : link;
    res.push(fullLink);
    if (category?.children?.length) {
      const children = getCategoryLinks(category?.children, fullLink);
      res.push(...children);
    }
  });
  return res;
}

/**
 * Get category name by link
 * @param link categories/xxx/front-end
 * @returns 前端
 */
export function getCategoryNameByLink(link: string): string {
  if (!link) return '';

  // Remove leading/trailing slashes and split
  const cleanLink = link.replace(/^\/+|\/+$/g, '');
  if (!cleanLink) return '';

  const segments = cleanLink.split('/').filter(Boolean); // Filter out empty segments
  if (segments.length === 0) return '';

  const lastSegment = segments[segments.length - 1];
  const res = Object.keys(categoryMap).find((key) => categoryMap[key] === lastSegment) ?? '';
  return res;
}

/**
 * Get category by link
 */
export function getCategoryByLink(categories: Category[], link?: string): Category | null {
  const name = getCategoryNameByLink(link ?? '');
  if (!name || !categories?.length) return null;
  for (let i = 0; i < categories.length; ++i) {
    const category = categories[i];
    if (category.name === name) {
      return category;
    }
    if (category?.children?.length) {
      const res = getCategoryByLink(category.children, link);
      if (res) return res;
    }
  }
  return null;
}

/**
 * 获取分类的父分类（递归查找）
 */
export function getParentCategory(category: Category | null, categories: Category[]): Category | null {
  if (!categories?.length || !category) return null;

  for (const c of categories) {
    if (!c.children?.length) continue;

    // 直接检查当前层级
    if (c.children.some((child) => child.name === category.name)) {
      return c;
    }

    // 递归检查子分类
    for (const child of c.children) {
      if (child.children?.length) {
        const result = getParentCategory(category, [child]);
        if (result) return result;
      }
    }
  }
  return null;
}

/**
 * Build category path from category names
 * @param categoryNames Array of category names or single category name
 * @returns Category path like "/categories/note/front-end"
 */
export function buildCategoryPath(categoryNames: string | string[]): string {
  if (!categoryNames) return '';

  const names = Array.isArray(categoryNames) ? categoryNames : [categoryNames];
  if (names.length === 0) return '';

  const slugs = names.map((name) => categoryMap[name]);
  return `/categories/${slugs.join('/')}`;
}

/**
 * 统一 ['分类1', '分类2'] 和 '分类'
 */
export function getCategoryArr(categories?: string[] | string) {
  if (!categories) return [];
  if (Array.isArray(categories) && categories.length) {
    return categories as string[];
  } else return [categories as string];
}
