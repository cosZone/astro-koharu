import { useTranslation } from '@hooks/useTranslation';
import type { ParsedQuiz } from '@lib/quiz';
import { cn } from '@lib/utils';
import { useCallback, useState } from 'react';
import { QuizBadge } from './QuizBadge';
import { QuizExplanation } from './QuizExplanation';

export function TrueFalseQuiz({ quiz }: { quiz: ParsedQuiz }) {
  const { t } = useTranslation();
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handleAnswer = useCallback(
    (value: boolean) => {
      if (revealed) return;
      setAnswer(value);
      setRevealed(true);
    },
    [revealed],
  );

  const isCorrect = answer === quiz.correctAnswer;

  return (
    <div className="space-y-3">
      <div>
        <QuizBadge type="trueFalse" />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Content from build-time Markdown */}
        <span dangerouslySetInnerHTML={{ __html: quiz.questionHtml }} />
      </div>
      <fieldset className="flex gap-3 border-none p-0" aria-label={t('quiz.quizOptions', { type: t('quiz.trueFalse') })}>
        <button
          type="button"
          onClick={() => handleAnswer(true)}
          disabled={revealed}
          aria-label={t('quiz.optionTrue')}
          aria-pressed={answer === true}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 font-medium transition-all',
            !revealed && 'cursor-pointer hover:border-green-400/50 hover:bg-green-50 dark:hover:bg-green-950/20',
            revealed && answer === true && isCorrect && 'border-green-500 bg-green-50 dark:bg-green-950/30',
            revealed && answer === true && !isCorrect && 'border-red-500 bg-red-50 dark:bg-red-950/30',
            revealed &&
              answer !== true &&
              quiz.correctAnswer === true &&
              'border-green-500/40 bg-green-50/50 dark:bg-green-950/15',
            revealed && answer !== true && quiz.correctAnswer !== true && 'opacity-40',
          )}
        >
          <span className="text-lg">✓</span>
          <span>{t('quiz.optionTrue')}</span>
        </button>
        <button
          type="button"
          onClick={() => handleAnswer(false)}
          disabled={revealed}
          aria-label={t('quiz.optionFalse')}
          aria-pressed={answer === false}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 font-medium transition-all',
            !revealed && 'cursor-pointer hover:border-red-400/50 hover:bg-red-50 dark:hover:bg-red-950/20',
            revealed && answer === false && isCorrect && 'border-green-500 bg-green-50 dark:bg-green-950/30',
            revealed && answer === false && !isCorrect && 'border-red-500 bg-red-50 dark:bg-red-950/30',
            revealed &&
              answer !== false &&
              quiz.correctAnswer === false &&
              'border-green-500/40 bg-green-50/50 dark:bg-green-950/15',
            revealed && answer !== false && quiz.correctAnswer !== false && 'opacity-40',
          )}
        >
          <span className="text-lg">✗</span>
          <span>{t('quiz.optionFalse')}</span>
        </button>
      </fieldset>
      <output
        aria-live="polite"
        className={cn(
          'block rounded-lg px-3 py-2 font-medium text-sm',
          !revealed && 'hidden',
          isCorrect
            ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300'
            : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300',
        )}
      >
        {revealed &&
          (isCorrect
            ? t('quiz.trueFalseCorrect')
            : t('quiz.trueFalseIncorrect', { answer: quiz.correctAnswer ? t('quiz.optionTrue') : t('quiz.optionFalse') }))}
      </output>
      <QuizExplanation html={quiz.explanationHtml} visible={revealed} />
    </div>
  );
}
