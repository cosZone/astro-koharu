import { useMemo } from 'react';
import { cn, shuffleArray } from '@/lib/utils';
import type { RandomPostItem } from './RandomPostList';

interface Props {
  posts: RandomPostItem[];
  fallbackPool: RandomPostItem[]; // Pool to randomly select from when no related posts
  fallbackCount: number; // Number of fallback posts to display
  startIndex?: number; // Starting index for fallback post numbering
}

export default function RelatedPostList({ posts, fallbackPool, fallbackCount, startIndex = 6 }: Props) {
  const hasRelatedPosts = posts.length > 0;

  // Shuffle fallback posts on client-side for fresh randomization
  const fallbackPosts = useMemo(() => {
    if (fallbackPool.length <= fallbackCount) {
      return shuffleArray(fallbackPool);
    }
    return shuffleArray(fallbackPool).slice(0, fallbackCount);
  }, [fallbackPool, fallbackCount]);

  const displayPosts = hasRelatedPosts ? posts : fallbackPosts;
  const title = hasRelatedPosts ? '相关文章' : '';

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
            <span className="shrink-0 font-mono text-foreground/30">{index + (hasRelatedPosts ? 1 : startIndex)}</span>
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
