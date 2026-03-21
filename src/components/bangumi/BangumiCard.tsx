import { useTranslation } from '@hooks/useTranslation';
import { cn } from '@lib/utils';
import type { TranslationKey } from '@/i18n/types';
import { COLLECTION_STATUS_COLORS } from '@/lib/bangumi/constants';
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
}

export function BangumiCard({ item }: BangumiCardProps) {
  const { t } = useTranslation();
  const { subject } = item;
  const title = subject.name_cn || subject.name;
  const year = subject.date?.slice(0, 4);
  const tags = item.tags.length > 0 ? item.tags : (subject.tags?.map((tag) => tag.name) ?? []);
  const displayTags = tags.slice(0, 3);
  const overflowCount = tags.length - displayTags.length;
  const imageUrl = subject.images?.common || subject.images?.medium;

  // Show user's rating if available, otherwise show subject's average score
  const score = item.rate > 0 ? item.rate : subject.score > 0 ? subject.score : null;
  const isUserRating = item.rate > 0;

  return (
    <a
      href={`https://bgm.tv/subject/${subject.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col overflow-hidden rounded-lg shadow-md transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        {imageUrl ? (
          <img src={imageUrl} alt={title} loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground text-sm">{t('bangumi.noImage')}</div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 to-transparent" />

        <span
          className={cn(
            'absolute top-2 left-2 rounded px-1.5 py-0.5 font-medium text-white text-xs',
            COLLECTION_STATUS_COLORS[item.type],
          )}
        >
          {t(COLLECTION_LABEL_KEYS[item.type])}
        </span>

        {score !== null && (
          <span
            className={cn(
              'absolute top-2 right-2 flex items-center gap-0.5 rounded bg-black/60 px-1.5 py-0.5 font-medium text-xs',
              isUserRating ? 'text-yellow-400' : 'text-white/80',
            )}
          >
            ★ {score}
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <h3 className="line-clamp-2 font-medium text-sm text-white leading-tight drop-shadow-md">{title}</h3>
          {year && <p className="mt-0.5 text-white/70 text-xs">{year}</p>}
        </div>
      </div>

      {displayTags.length > 0 && (
        <div className="flex flex-wrap gap-1 bg-card px-2 py-1.5">
          {displayTags.map((tag) => (
            <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
              {tag}
            </span>
          ))}
          {overflowCount > 0 && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">+{overflowCount}</span>
          )}
        </div>
      )}
    </a>
  );
}
