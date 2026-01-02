import { cn, shuffleArray } from '@lib/utils';
import { useMemo } from 'react';
import type { RandomPostItem } from './RandomPostList';

interface Props {
  allPosts: RandomPostItem[];
  relatedPosts: RandomPostItem[];
  leftCount: number;
  rightCount: number;
}

/**
 * Wrapper component to coordinate random post selection for small post counts
 * Ensures no duplicate posts between left (random) and right (related/fallback) sides
 */
export default function PostFooterLists({ allPosts, relatedPosts, leftCount, rightCount }: Props) {
  const { leftPosts, rightPosts, hasRelatedPosts } = useMemo(() => {
    const hasRelated = relatedPosts.length > 0;

    // Debug logging
    if (import.meta.env.DEV) {
      console.log('[PostFooterLists] relatedPosts:', relatedPosts);
      console.log('[PostFooterLists] hasRelated:', hasRelated);
    }

    // Shuffle once and split to avoid duplicates
    const shuffled = shuffleArray(allPosts);
    return {
      leftPosts: shuffled.slice(0, leftCount),
      rightPosts: hasRelated ? relatedPosts : shuffled.slice(leftCount, leftCount + rightCount),
      hasRelatedPosts: hasRelated,
    };
  }, [allPosts, relatedPosts, leftCount, rightCount]);

  const rightTitle = hasRelatedPosts ? '相关文章' : '';

  return (
    <>
      {/* Left side: Random posts */}
      <div className="flex flex-col gap-4">
        <h2 className="font-semibold text-2xl text-foreground/80">随机文章</h2>
        <div className="flex flex-col gap-2">
          {leftPosts.map((post, index) => (
            <a
              key={post.slug}
              href={`/post/${post.link ?? post.slug}`}
              className="group flex gap-3 rounded-md p-2 text-sm transition-colors duration-300 hover:bg-foreground/5 hover:text-primary"
            >
              <span className="shrink-0 font-mono text-foreground/30">{index + 1}</span>
              <div className="flex min-w-0 flex-col gap-0.5">
                {post.categoryName && <div className="truncate text-foreground/50 text-xs">{post.categoryName}</div>}
                <div className="line-clamp-2 text-foreground/80 transition-colors group-hover:text-primary">{post.title}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Right side: Related or fallback posts */}
      {rightPosts.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold text-2xl text-foreground/80">{rightTitle}</h2>
          <div className={cn('flex flex-col gap-2', { '-mt-4 pt-12 md:-mt-5 md:pt-0': !hasRelatedPosts })}>
            {rightPosts.map((post, index) => (
              <a
                key={post.slug}
                href={`/post/${post.link ?? post.slug}`}
                className="group flex gap-3 rounded-md p-2 text-sm transition-colors duration-300 hover:bg-foreground/5 hover:text-primary"
              >
                <span className="shrink-0 font-mono text-foreground/30">{index + (hasRelatedPosts ? 1 : leftCount + 1)}</span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  {post.categoryName && <div className="truncate text-foreground/50 text-xs">{post.categoryName}</div>}
                  <div className="line-clamp-2 text-foreground/80 transition-colors group-hover:text-primary">{post.title}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
