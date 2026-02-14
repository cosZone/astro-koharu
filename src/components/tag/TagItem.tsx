import { useTranslation } from '@hooks/useTranslation';
import { buildTagPath } from '@lib/content/tags';
import { localizedPath } from '@/i18n';

const TAG_COLORS = [
  'from-blue-400/10 to-indigo-300/10 hover:from-blue-400/80 hover:to-indigo-300/80 text-blue-400/70 hover:text-blue-50',
  'from-pink-300/10 to-rose-200/10 hover:from-pink-300/80 hover:to-rose-200/80 text-pink-400/70 hover:text-pink-50',
  'from-violet-400/10 to-purple-300/10 hover:from-violet-400/80 hover:to-purple-300/80 text-violet-400/70 hover:text-violet-50',
  'from-sky-400/10 to-blue-300/10 hover:from-sky-400/80 hover:to-blue-300/80 text-sky-400/70 hover:text-sky-50',
];

interface TagItemProps {
  tag: string;
  count: number;
  colorIndex: number;
  locale?: string;
}

export function TagItem({ tag, count, colorIndex, locale }: TagItemProps) {
  const { t } = useTranslation();
  return (
    <a
      href={localizedPath(buildTagPath(tag), locale)}
      aria-label={t('tag.viewTagPosts', { tag, count })}
      className={`relative flex items-center rounded-lg bg-linear-to-r px-3 py-1.5 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${TAG_COLORS[colorIndex]}`}
    >
      <span className="font-medium">{tag}</span>
      <span className="ml-1.5 truncate rounded-full bg-white/10 px-1.5 text-xs">{count}</span>
    </a>
  );
}
