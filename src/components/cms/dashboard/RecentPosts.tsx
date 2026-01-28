/**
 * RecentPosts Component
 *
 * Displays a list of recently updated posts.
 */

import type { PostListItem } from '@lib/cms';
import { cn } from '@lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface RecentPostsProps {
  posts: PostListItem[];
  onEdit?: (postId: string) => void;
}

export function RecentPosts({ posts, onEdit }: RecentPostsProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-4 font-semibold text-sm">Recent Updates</h3>
        <p className="text-muted-foreground text-sm">No recent posts</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 font-semibold text-sm">Recent Updates</h3>
      <div className="space-y-2">
        {posts.map((post) => {
          const date = post.updated || post.date;
          const timeAgo = formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhCN });

          return (
            <button
              key={post.id}
              type="button"
              onClick={() => onEdit?.(post.id)}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded-md p-2 text-left transition-colors',
                'hover:bg-accent/50',
                onEdit && 'cursor-pointer',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-sm">{post.title}</p>
                <p className="text-muted-foreground text-xs">{timeAgo}</p>
              </div>
              {post.draft && (
                <span className="shrink-0 rounded-full bg-orange-500/10 px-2 py-0.5 text-orange-500 text-xs">Draft</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
