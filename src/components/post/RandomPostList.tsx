import { useEffect, useState } from 'react';

export interface RandomPostItem {
  slug: string;
  link?: string;
  title: string;
  categoryName?: string;
}

interface Props {
  posts: RandomPostItem[];
  count?: number;
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function RandomPostList({ posts, count = 5 }: Props) {
  const [displayPosts, setDisplayPosts] = useState<RandomPostItem[]>([]);

  useEffect(() => {
    const shuffled = shuffleArray(posts).slice(0, count);
    setDisplayPosts(shuffled);
  }, [posts, count]);

  // 初始渲染显示骨架
  if (displayPosts.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="font-semibold text-2xl text-foreground/80">随机文章</h2>
        <div className="flex flex-col gap-2">
          {Array.from({ length: count }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loader, order never changes
            <div key={i} className="flex gap-3 rounded-md p-2">
              <span className="shrink-0 font-mono text-foreground/30">{i + 1}</span>
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

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-semibold text-2xl text-foreground/80">随机文章</h2>
      <div className="flex flex-col gap-2">
        {displayPosts.map((post, index) => (
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
