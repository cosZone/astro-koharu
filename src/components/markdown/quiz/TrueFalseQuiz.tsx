import type { ParsedQuiz } from '@lib/quiz';
import { cn } from '@lib/utils';
import { useCallback, useState } from 'react';
import { QuizBadge } from './QuizBadge';
import { QuizExplanation } from './QuizExplanation';

export function TrueFalseQuiz({ quiz }: { quiz: ParsedQuiz }) {
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
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => handleAnswer(true)}
          disabled={revealed}
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
          <span>正确</span>
        </button>
        <button
          type="button"
          onClick={() => handleAnswer(false)}
          disabled={revealed}
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
          <span>错误</span>
        </button>
      </div>
      {revealed && (
        <div
          className={cn(
            'rounded-lg px-3 py-2 font-medium text-sm',
            isCorrect
              ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300'
              : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300',
          )}
        >
          {isCorrect ? '回答正确！' : `回答错误。该命题是${quiz.correctAnswer ? '正确' : '错误'}的。`}
        </div>
      )}
      <QuizExplanation html={quiz.explanationHtml} visible={revealed} />
    </div>
  );
}
