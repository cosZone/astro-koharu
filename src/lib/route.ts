import { Routes } from '@constants/router';
import type { BlogPost } from 'types/blog';

export type RouteParams<T extends Routes> = T extends Routes.Post ? BlogPost | undefined : undefined;

export function routeBuilder<T extends Routes>(route: T, param: RouteParams<typeof route>) {
  let href: string = route;
  if (!param) return href;
  switch (route) {
    case Routes.Post:
      href += `/${param?.data?.link ?? param?.slug}`;
      break;
    default:
      break;
  }
  return href;
}

export const showDirRoutes = [Routes.Post];
