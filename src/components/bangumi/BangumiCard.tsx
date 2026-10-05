import { useTranslation } from '@hooks/useTranslation';
import { cn } from '@lib/utils';
import type { TranslationKey } from '@/i18n/types';
import type { BangumiCollectionType, BangumiUserCollection } from '@/types/bangumi';

const COLLECTION_LABEL_KEYS: Record<BangumiCollectionType, TranslationKey> = {
  1: 'bangumi.wish',
  2: 'bangumi.collected',
  3: 'bangumi.watching',
  4: 'bangumi.onHold',
  5: 'bangumi.dropped',
};

interface BangumiCardProps {
  item: BangumiUserCollection;
  /** The status is redundant once the list is already filtered to one status. */
  showStatus: boolean;
}

export function BangumiCard({ item, showStatus }: BangumiCardProps) {
  const { t } = useTranslation();
  const { subject } = item;
  const title = subject.name_cn || subject.name;
  const year = subject.date?.slice(0, 4);
  const imageUrl = subject.images?.common || subject.images?.medium;
  // The user's own rating wins over the community average and is inked in the accent color.
  const isUserRating = item.rate > 0;
  const score = isUserRating ? item.rate : subject.score > 0 ? subject.score : null;
  const isWatching = item.type === 3;

  return (
    <a href={`https://bgm.tv/subject/${subject.id}`} target="_blank" rel="noopener noreferrer" className="bangumi-card group">
      <div className="bangumi-poster">
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="flex size-full items-center justify-center text-muted-foreground text-xs">
            {t('bangumi.noImage')}
          </span>
        )}
        {isWatching && showStatus && <span className="bangumi-ribbon">{t('bangumi.watching')}</span>}
      </div>
      <h3 className="bangumi-title" title={title}>
        {title}
      </h3>
      <p className="bangumi-meta">
        {showStatus && !isWatching && <span>{t(COLLECTION_LABEL_KEYS[item.type])}</span>}
        {year && <span>{year}</span>}
        {score !== null && <span className={cn('tabular-nums', isUserRating && 'bangumi-own-score')}>★ {score}</span>}
      </p>
    </a>
  );
}
