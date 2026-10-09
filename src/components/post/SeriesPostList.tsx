/**
 * SeriesPostList - 显示系列文章列表
 */

import { useTranslation } from '@hooks/useTranslation';
import { encodeSlug } from '@lib/url';
import { cn } from '@lib/utils';
import { localizedPath } from '@/i18n';
import type { PostRef } from '@/types/blog';

interface SeriesPostListProps {
  posts: PostRef[];
  currentPostSlug?: string;
  className?: string;
  locale?: string;
}

export function SeriesPostList({ posts, currentPostSlug, className, locale }: SeriesPostListProps) {
  const { t } = useTranslation(locale);
  if (!posts?.length) {
    return <div className="py-8 text-center text-muted-foreground text-sm">{t('series.noPosts')}</div>;
  }

  return (
    <div className={cn('series-thread', className)} data-series-list>
      {posts.map((post) => {
        const href = localizedPath(`/post/${encodeSlug(post.link ?? post.slug)}`, locale);
        const isActive = post.slug === currentPostSlug;

        return (
          <a key={post.slug} href={href} className="series-thread-item" aria-current={isActive ? 'page' : undefined}>
            <span className="series-thread-bead" aria-hidden="true" />
            <span className="series-thread-title">{post.title}</span>
          </a>
        );
      })}
    </div>
  );
}
