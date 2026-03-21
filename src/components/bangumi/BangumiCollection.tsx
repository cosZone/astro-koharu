import { useBangumiData } from '@hooks/useBangumiData';
import { useTranslation } from '@hooks/useTranslation';
import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useMemo, useState } from 'react';
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

interface BangumiCollectionProps {
  userId: string;
}

export function BangumiCollection({ userId }: BangumiCollectionProps) {
  const { t } = useTranslation();
  const { data, isLoading, error, retry } = useBangumiData(userId);

  const [activeTab, setActiveTab] = useState<SubjectTypeKey>('anime');
  const [activeFilter, setActiveFilter] = useState<BangumiCollectionType | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const shouldReduceMotion = useReducedMotion();

  const springTransition = shouldReduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 400, damping: 30 };

  const tabs = useMemo(() => {
    return SUBJECT_TYPE_KEYS.filter((key) => data[key].length > 0).map((key) => ({
      key,
      label: t(TAB_LABEL_KEYS[key]),
      count: data[key].length,
    }));
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
        <div className="flex gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable id
            <div key={i} className="h-8 w-16 animate-pulse rounded bg-muted" />
          ))}
        </div>
        <div className="grid desktop:grid-cols-4 grid-cols-3 gap-4 md:grid-cols-2">
          {Array.from({ length: 8 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable id
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] rounded-lg bg-muted" />
              <div className="mt-2 h-4 w-3/4 rounded bg-muted" />
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
    <div className="space-y-4 py-4">
      <div className="flex items-center gap-6 border-border border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key)}
            className={cn(
              'relative flex items-center gap-1.5 pb-2.5 font-medium text-sm transition-colors',
              activeTab === tab.key ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            <span
              className={cn(
                'rounded-full px-1.5 text-xs tabular-nums',
                activeTab === tab.key ? 'text-primary' : 'text-muted-foreground/60',
              )}
            >
              {tab.count}
            </span>
            {activeTab === tab.key && (
              <motion.span
                layoutId="bangumi-tab-indicator"
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
                transition={springTransition}
              />
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTER_OPTIONS.map(
          ({ key, labelKey }) =>
            (key === 'all' || (filterCounts[key] ?? 0) > 0) && (
              <button
                key={key}
                type="button"
                onClick={() => handleFilterChange(key)}
                className={cn(
                  'rounded-full border px-3 py-1 font-medium text-xs transition-colors',
                  activeFilter === key
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-transparent bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                {t(labelKey)}
                <span className="ml-1 tabular-nums opacity-60">({filterCounts[key] ?? 0})</span>
              </button>
            ),
        )}
      </div>

      <AnimatePresence mode="popLayout">
        <motion.div
          key={`${activeTab}-${activeFilter}-${currentPage}`}
          className="grid desktop:grid-cols-4 grid-cols-3 gap-3 md:grid-cols-2"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {pageItems.map((item) => (
            <BangumiCard key={item.subject_id} item={item} />
          ))}
        </motion.div>
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
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            aria-label={t('pagination.prev')}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <Icon icon="ri:arrow-left-s-line" className="size-4" />
          </button>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                if (totalPages <= 7) return true;
                if (page === 1 || page === totalPages) return true;
                return Math.abs(page - currentPage) <= 2;
              })
              .map((page, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev !== undefined && page - prev > 1;
                return (
                  <span key={page} className="flex items-center">
                    {showEllipsis && <span className="px-1 text-muted-foreground">…</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(page)}
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
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            aria-label={t('pagination.next')}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <Icon icon="ri:arrow-right-s-line" className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
