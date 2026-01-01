/**
 * SeriesNavigation - 系列文章上一篇/下一篇导航
 */
import { Routes } from '@constants/router';
import { routeBuilder } from '@lib/route';
import { cn } from '@lib/utils';
import { RiArrowDownSLine, RiArrowLeftSLine, RiArrowRightSLine, RiArrowUpSLine } from 'react-icons/ri';
import type { BlogPost } from '@/types/blog';

interface SeriesNavigationProps {
  prevPost?: BlogPost | null;
  nextPost?: BlogPost | null;
  className?: string;
}

export function SeriesNavigation({ prevPost, nextPost, className }: SeriesNavigationProps) {
  if (!prevPost && !nextPost) {
    return null;
  }

  const scrollBehavior: ScrollBehavior = 'smooth';

  return (
    <div className={cn('mt-4 flex flex-col gap-3 border-border border-t pt-4 md:mt-0 md:pt-2', className)}>
      {/* 文章导航 */}
      <div className="flex items-center justify-between gap-2">
        {/* 上一篇 */}
        {prevPost ? (
          <a
            href={routeBuilder(Routes.Post, prevPost)}
            className={cn(
              'group flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors',
              'text-muted-foreground hover:bg-accent hover:text-primary',
              'min-w-0 max-w-[45%] flex-1',
            )}
            title={prevPost.data.title}
            suppressHydrationWarning
          >
            <RiArrowLeftSLine className="h-4 w-4 shrink-0" />
            <span className="truncate text-xs">{prevPost.data.title}</span>
          </a>
        ) : (
          <div className="max-w-[45%] flex-1" />
        )}

        {/* 下一篇 */}
        {nextPost ? (
          <a
            href={routeBuilder(Routes.Post, nextPost)}
            className={cn(
              'group flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors',
              'text-muted-foreground hover:bg-accent hover:text-primary',
              'min-w-0 max-w-[45%] flex-1 justify-end text-right',
            )}
            title={nextPost.data.title}
            suppressHydrationWarning
          >
            <span className="truncate text-xs">{nextPost.data.title}</span>
            <RiArrowRightSLine className="h-4 w-4 shrink-0" />
          </a>
        ) : (
          <div className="max-w-[45%] flex-1" />
        )}
      </div>

      {/* 回到顶部和滚到底部 */}
      <div className="flex justify-center gap-2">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: scrollBehavior })}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 transition-colors',
            'text-muted-foreground text-xs hover:bg-accent hover:text-primary',
          )}
          title="回到顶部"
          aria-label="回到顶部"
          suppressHydrationWarning
        >
          <RiArrowUpSLine className="h-4 w-4" />
          回到顶部
        </button>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: scrollBehavior })}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 transition-colors',
            'text-muted-foreground text-xs hover:bg-accent hover:text-primary',
          )}
          title="滚到底部"
          aria-label="滚到底部"
          suppressHydrationWarning
        >
          <RiArrowDownSLine className="h-4 w-4" />
          滚到底部
        </button>
      </div>
    </div>
  );
}
