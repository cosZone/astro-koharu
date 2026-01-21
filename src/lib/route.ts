import { Routes } from '@constants/router';
import type { BlogPost } from 'types/blog';

export type RouteParams<T extends Routes> = T extends Routes.Post ? BlogPost | undefined : undefined;

/**
 * 编码 slug，保留 / 但转义其他 URL 不安全字符，同 Hexo 行为
 * @param slug 原始 slug
 * @returns 编码后的 slug
 */
export const encodeSlug = (slug: string) => slug.split('/').map(encodeURIComponent).join('/');

export function routeBuilder<T extends Routes>(route: T, param: RouteParams<typeof route>) {
  let href: string = route;
  if (!param) return href;
  switch (route) {
    case Routes.Post:
      href += `/${encodeSlug(param?.data?.link ?? param?.slug)}`;
      break;
    default:
      break;
  }
  return href;
}

export const showDirRoutes = [Routes.Post];
