/**
 * Site-bound colophon helpers: localized mark dictionary and per-post resolution.
 * Pure resolution logic lives in `./colophon`.
 */

import { localizeColophonConfig, type ResolvedColophonConfig } from '@lib/config/colophon';
import { colophonConfig } from '@lib/config/site';
import type { BlogPost } from 'types/blog';
import { getContentColophon } from '@/i18n/content';
import { type ColophonItem, resolvePostColophon } from './colophon';

export function getColophonConfig(locale: string): ResolvedColophonConfig {
  return localizeColophonConfig(colophonConfig, getContentColophon(locale));
}

const warned = new Set<string>();

/** Resolve a post's marks for `locale`, logging each config warning once per post at build time. */
export function getPostColophon(post: BlogPost, locale: string): ColophonItem[] {
  const { items, warnings } = resolvePostColophon(post.data.colophon, getColophonConfig(locale));
  for (const warning of warnings) {
    const key = `${post.id}:${warning}`;
    if (warned.has(key)) continue;
    warned.add(key);
    console.warn(`[colophon] ${post.id}: ${warning}`);
  }
  return items;
}
