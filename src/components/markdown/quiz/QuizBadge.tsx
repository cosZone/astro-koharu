import { useTranslation } from '@hooks/useTranslation';
import type { QuizType } from '@lib/quiz';
import { cn } from '@lib/utils';
import type { TranslationKey } from '@/i18n/types';

const BADGE_CONFIG: Record<QuizType, { labelKey: TranslationKey; color: string }> = {
  single: { labelKey: 'quiz.single', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  multi: { labelKey: 'quiz.multi', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  trueFalse: { labelKey: 'quiz.trueFalse', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  fill: { labelKey: 'quiz.fill', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
};

export function QuizBadge({ type }: { type: QuizType }) {
  const { t } = useTranslation();
  const { labelKey, color } = BADGE_CONFIG[type];
  return <span className={cn('mr-2 inline-block rounded-md px-2 py-0.5 font-semibold text-xs', color)}>{t(labelKey)}</span>;
}
