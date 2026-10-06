import { LazyMotionProvider } from '@components/common/LazyMotionProvider';
import { useBangumiData } from '@hooks/useBangumiData';
import { useMotionLevel } from '@hooks/useMotionLevel';
import { useTranslation } from '@hooks/useTranslation';
import { Icon } from '@iconify/react';
import { getScrollBehavior } from '@lib/motion-level';
import { cn } from '@lib/utils';
import { AnimatePresence, m } from 'motion/react';
import { useMemo, useRef, useState } from 'react';
import type { TranslationKey } from '@/i18n/types';
import { ITEMS_PER_PAGE, SUBJECT_TYPE_KEYS, type SubjectTypeKey } from '@/lib/bangumi/constants';
import type { BangumiCollectionType } from '@/types/bangumi';
import { BangumiCard } from './BangumiCard';

const TAB_LABEL_KEYS: Record<SubjectTypeKey, TranslationKey> = {
  anime: 'bangumi.anime',
  book: 'bangumi.book',
  music: 'bangumi.music',
  game: 'bangumi.game',
  real: 'bangumi.real',
};

const FILTER_OPTIONS: Array<{ key: BangumiCollectionType | 'all'; labelKey: TranslationKey }> = [
  { key: 'all', labelKey: 'bangumi.all' },
  { key: 2, labelKey: 'bangumi.collected' },
  { key: 3, labelKey: 'bangumi.watching' },
  { key: 1, labelKey: 'bangumi.wish' },
  { key: 4, labelKey: 'bangumi.onHold' },
  { key: 5, labelKey: 'bangumi.dropped' },
];

function getVisiblePages(totalPages: number, currentPage: number): number[] {
  const pages: number[] = [];
  for (let page = 1; page <= totalPages; page += 1) {
    if (totalPages <= 7 || page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2) {
      pages.push(page);
    }
  }
  return pages;
}

interface BangumiCollectionProps {
  userId: string;
}

export function BangumiCollection({ userId }: BangumiCollectionProps) {
  const { t } = useTranslation();
  const { data, isLoading, error, retry } = useBangumiData(userId);

  const [activeTab, setActiveTab] = useState<SubjectTypeKey>('anime');
  const [activeFilter, setActiveFilter] = useState<BangumiCollectionType | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const shouldReduceMotion = useMotionLevel() === 'reduced';

  const tabs = useMemo(() => {
    return SUBJECT_TYPE_KEYS.flatMap((key) =>
      data[key].length > 0
        ? [
            {
              key,
              label: t(TAB_LABEL_KEYS[key]),
              count: data[key].length,
            },
          ]
        : [],
    );
  }, [data, t]);

  const tabItems = data[activeTab];

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tabItems.length };
    for (const item of tabItems) {
      counts[item.type] = (counts[item.type] ?? 0) + 1;
    }
    return counts;
  }, [tabItems]);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return tabItems;
    return tabItems.filter((item) => item.type === activeFilter);
  }, [tabItems, activeFilter]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const pageItems = filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const visiblePages = getVisiblePages(totalPages, currentPage);

  const shelfRef = useRef<HTMLDivElement>(null);
  /** Switching pages from the bottom pager brings the shelf's top back into view instead of leaving the reader mid-page. */
  function goToPage(page: number) {
    setCurrentPage(page);
    const shelf = shelfRef.current;
    if (shelf && shelf.getBoundingClientRect().top < 0) {
      shelf.scrollIntoView({ behavior: getScrollBehavior(), block: 'start' });
    }
  }

  function handleTabChange(key: SubjectTypeKey) {
    setActiveTab(key);
    setActiveFilter('all');
    setCurrentPage(1);
  }

  function handleFilterChange(key: BangumiCollectionType | 'all') {
    setActiveFilter(key);
    setCurrentPage(1);
  }

  if (isLoading) {
    return (
      <div className="space-y-4 py-8" aria-hidden="true">
        <div className="flex gap-5">
          {Array.from({ length: 3 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable id
            <div key={i} className="h-5 w-14 animate-pulse rounded bg-muted" />
          ))}
        </div>
        <div className="bangumi-grid">
          {Array.from({ length: 10 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable id
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] rounded-xl bg-muted" />
              <div className="mt-2 h-3.5 w-3/4 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 py-8">
        <p className="text-muted-foreground">{t('bangumi.error')}</p>
        <button
          type="button"
          onClick={retry}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm transition-colors hover:bg-primary/90"
        >
          {t('bangumi.retry')}
        </button>
      </div>
    );
  }

  if (tabs.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center py-8">
        <p className="text-muted-foreground">{t('bangumi.noItems')}</p>
      </div>
    );
  }

  return (
    <LazyMotionProvider>
      <div ref={shelfRef} className="bangumi-shelf space-y-5">
        <div className="space-y-1">
          <div className="index-tabs bangumi-type-tabs">
            {tabs.map((tab) => (
              <button key={tab.key} type="button" aria-pressed={activeTab === tab.key} onClick={() => handleTabChange(tab.key)}>
                {tab.label}
                <sup>{tab.count}</sup>
              </button>
            ))}
          </div>
          <div className="index-tabs index-tabs-quiet">
            {FILTER_OPTIONS.map(
              ({ key, labelKey }) =>
                (key === 'all' || (filterCounts[key] ?? 0) > 0) && (
                  <button key={key} type="button" aria-pressed={activeFilter === key} onClick={() => handleFilterChange(key)}>
                    {t(labelKey)}
                    <sup>{filterCounts[key] ?? 0}</sup>
                  </button>
                ),
            )}
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          <m.div
            key={`${activeTab}-${activeFilter}-${currentPage}`}
            className="bangumi-grid"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
          >
            {pageItems.map((item) => (
              <BangumiCard key={item.subject_id} item={item} showStatus={activeFilter === 'all'} />
            ))}
          </m.div>
        </AnimatePresence>

        {filteredItems.length === 0 && (
          <div className="flex min-h-[200px] items-center justify-center">
            <p className="text-muted-foreground">{t('bangumi.noItems')}</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              type="button"
              onClick={() => goToPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              aria-label={t('pagination.prev')}
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <Icon icon="ri:arrow-left-s-line" className="size-4" />
            </button>
            <div className="flex gap-1">
              {visiblePages.map((page, index) => {
                const previousPage = visiblePages[index - 1];
                const showEllipsis = previousPage !== undefined && page - previousPage > 1;
                return (
                  <span key={page} className="flex items-center">
                    {showEllipsis && <span className="px-1 text-muted-foreground">…</span>}
                    <button
                      type="button"
                      onClick={() => goToPage(page)}
                      aria-current={currentPage === page ? 'page' : undefined}
                      className={cn(
                        'min-w-[2rem] rounded-md px-2 py-1.5 text-sm transition-colors',
                        currentPage === page
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80',
                      )}
                    >
                      {page}
                    </button>
                  </span>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              aria-label={t('pagination.next')}
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <Icon icon="ri:arrow-right-s-line" className="size-4" />
            </button>
          </div>
        )}
      </div>
    </LazyMotionProvider>
  );
}
