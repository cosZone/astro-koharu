import { shuffleArray } from '@lib/utils';
import { useMemo } from 'react';

export interface RandomPostItem {
  slug: string;
  link?: string;
  title: string;
  categoryName?: string;
}

interface Props {
  postsPool: RandomPostItem[]; // Pool to randomly select from
  count: number; // Number of posts to display
}

export default function RandomPostList({ postsPool, count }: Props) {
  // Shuffle on client-side for fresh randomization on each page load
  const posts = useMemo(() => {
    if (postsPool.length <= count) {
      return shuffleArray(postsPool);
    }
    return shuffleArray(postsPool).slice(0, count);
  }, [postsPool, count]);
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-semibold text-2xl text-foreground/80">随机文章</h2>
      <div className="flex flex-col gap-2">
        {posts.map((post, index) => (
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
  );
}
