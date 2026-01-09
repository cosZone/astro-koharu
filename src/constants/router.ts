// Import YAML config directly - processed by @rollup/plugin-yaml

import type { RouterItem } from '@lib/config/types';
import yamlConfig from '../../config/site.yaml';

export type Router = RouterItem;

// Routes enum kept for backwards compatibility
export enum Routes {
  Home = '/',
  About = '/about',
  Categories = '/categories',
  Tags = '/tags',
  Weekly = '/weekly',
  Friends = '/friends',
  Post = '/post',
  Archives = '/archives',
}

export const routers: Router[] = yamlConfig.navigation ?? [
  { name: 'Home', path: Routes.Home, icon: 'fa6-solid:house-chimney' },
  { name: 'About', path: Routes.About, icon: 'fa6-regular:circle-user' },
];
