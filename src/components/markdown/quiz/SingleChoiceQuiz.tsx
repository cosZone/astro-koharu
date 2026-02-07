import type { ParsedQuiz } from '@lib/quiz';
import { cn } from '@lib/utils';
import { useCallback, useState } from 'react';
import { QuizBadge } from './QuizBadge';
import { QuizExplanation } from './QuizExplanation';
import { QuizOption } from './QuizOption';

export function SingleChoiceQuiz({ quiz }: { quiz: ParsedQuiz }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handleSelect = useCallback(
    (index: number) => {
      if (revealed) return;
      setSelectedIndex(index);
      setRevealed(true);
    },
    [revealed],
  );

  const isCorrect = selectedIndex !== null && quiz.options[selectedIndex]?.isCorrect;

  return (
    <div className="space-y-3">
      <div>
        <QuizBadge type="single" />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Content from build-time Markdown */}
        <span dangerouslySetInnerHTML={{ __html: quiz.questionHtml }} />
      </div>
      <fieldset className="space-y-2 border-none p-0" aria-label="单选题选项">
        {quiz.options.map((option, index) => (
          <QuizOption
            // biome-ignore lint/suspicious/noArrayIndexKey: Options are static
            key={index}
            index={index}
            html={option.html}
            isCorrect={option.isCorrect}
            isSelected={index === selectedIndex}
            revealed={revealed}
            disabled={revealed}
            onClick={() => handleSelect(index)}
          />
        ))}
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
            ? '回答正确！'
            : `回答错误。正确答案是 ${String.fromCharCode(65 + quiz.options.findIndex((o) => o.isCorrect))}。`)}
      </output>
      <QuizExplanation html={quiz.explanationHtml} visible={revealed} />
    </div>
  );
}
