import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { RandomPostItem } from './RandomPostList';

interface Props {
  posts: RandomPostItem[];
  fallbackPosts: RandomPostItem[];
  fallbackCount?: number;
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function RelatedPostList({ posts, fallbackPosts, fallbackCount = 5 }: Props) {
  const hasRelatedPosts = posts.length > 0;
  const [displayPosts, setDisplayPosts] = useState<RandomPostItem[]>(hasRelatedPosts ? posts : []);

  useEffect(() => {
    if (!hasRelatedPosts && fallbackPosts.length > 0) {
      const shuffled = shuffleArray(fallbackPosts).slice(0, fallbackCount);
      setDisplayPosts(shuffled);
    }
  }, [hasRelatedPosts, fallbackPosts, fallbackCount]);

  const title = hasRelatedPosts ? '相关文章' : '';

  // 骨架屏：仅在没有相关文章且 fallback 还在加载时显示
  if (!hasRelatedPosts && displayPosts.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="font-semibold text-2xl text-foreground/80">&nbsp;</h2>
        <div className={cn('flex flex-col gap-2', '-mt-4 pt-12 md:-mt-5 md:pt-0')}>
          {Array.from({ length: fallbackCount }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loader, order never changes
            <div key={i} className="flex gap-3 rounded-md p-2">
              <span className="shrink-0 font-mono text-foreground/30">{i + 6}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="h-3 w-16 animate-pulse rounded bg-foreground/10" />
                <div className="h-4 w-full animate-pulse rounded bg-foreground/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (displayPosts.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-semibold text-2xl text-foreground/80">{title}</h2>
      <div className={cn('flex flex-col gap-2', { '-mt-4 pt-12 md:-mt-5 md:pt-0': !hasRelatedPosts })}>
        {displayPosts.map((post, index) => (
          <a
            key={post.slug}
            href={`/post/${post.link ?? post.slug}`}
            className="group flex gap-3 rounded-md p-2 text-sm transition-colors duration-300 hover:bg-foreground/5 hover:text-primary"
          >
            <span className="shrink-0 font-mono text-foreground/30">{index + (hasRelatedPosts ? 1 : 6)}</span>
            <div className="flex min-w-0 flex-col gap-0.5">
              {post.categoryName && <div className="truncate text-foreground/50 text-xs">{post.categoryName}</div>}
              <div className="line-clamp-2 text-foreground/80 transition-colors group-hover:text-primary">{post.title}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
