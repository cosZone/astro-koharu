import { Routes } from '@constants/router';
import { getPostSlug } from '@lib/content/locale';
import type { BlogPost, PostRef } from 'types/blog';

export type RouteParams<T extends Routes> = T extends Routes.Post ? BlogPost | PostRef | undefined : undefined;

/**
 * 编码 slug，保留 / 但转义其他 URL 不安全字符，同 Hexo 行为
 * @param slug 原始 slug
 * @returns 编码后的 slug
 */
export const encodeSlug = (slug: string) => slug?.split('/').map(encodeURIComponent).join('/') ?? '';

export function routeBuilder<T extends Routes>(route: T, param: RouteParams<typeof route>) {
  let href: string = route;
  if (!param) return href;
  switch (route) {
    case Routes.Post: {
      // CollectionEntry has `collection`; PostRef.slug is already transliterated by transforms
      const slug = 'collection' in param ? getPostSlug(param as BlogPost) : (param.link ?? param.slug);
      href += `/${encodeSlug(slug)}`;
      break;
    }
    default:
      break;
  }
  return href;
}

export const showDirRoutes = [Routes.Post];
