import type { ParsedQuiz } from '@lib/quiz';
import { cn } from '@lib/utils';
import { useCallback, useState } from 'react';
import { QuizBadge } from './QuizBadge';
import { QuizExplanation } from './QuizExplanation';
import { QuizOption } from './QuizOption';

export function MultiChoiceQuiz({ quiz }: { quiz: ParsedQuiz }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState(false);

  const toggleOption = useCallback(
    (index: number) => {
      if (revealed) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
      });
    },
    [revealed],
  );

  const handleSubmit = useCallback(() => {
    if (selected.size === 0 || revealed) return;
    setRevealed(true);
  }, [selected.size, revealed]);

  const correctIndices = new Set(quiz.options.map((o, i) => (o.isCorrect ? i : -1)).filter((i) => i >= 0));
  const isAllCorrect = revealed && selected.size === correctIndices.size && [...selected].every((i) => correctIndices.has(i));

  return (
    <div className="space-y-3">
      <div>
        <QuizBadge type="multi" />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Content from build-time Markdown */}
        <span dangerouslySetInnerHTML={{ __html: quiz.questionHtml }} />
      </div>
      <fieldset className="space-y-2 border-none p-0" aria-label="多选题选项">
        {quiz.options.map((option, index) => (
          <QuizOption
            // biome-ignore lint/suspicious/noArrayIndexKey: Options are static
            key={index}
            index={index}
            html={option.html}
            isCorrect={option.isCorrect}
            isSelected={selected.has(index)}
            revealed={revealed}
            disabled={revealed}
            onClick={() => toggleOption(index)}
          />
        ))}
      </fieldset>
      {!revealed && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={selected.size === 0}
          className={cn(
            'rounded-lg px-4 py-2 font-medium text-sm transition-all',
            selected.size > 0
              ? 'bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]'
              : 'cursor-not-allowed bg-muted text-muted-foreground',
          )}
        >
          提交答案（已选 {selected.size} 项）
        </button>
      )}
      <output
        aria-live="polite"
        className={cn(
          'block rounded-lg px-3 py-2 font-medium text-sm',
          !revealed && 'hidden',
          isAllCorrect
            ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300'
            : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300',
        )}
      >
        {revealed &&
          (isAllCorrect
            ? '回答正确！'
            : `回答错误。正确答案是 ${[...correctIndices].map((i) => String.fromCharCode(65 + i)).join('、')}。`)}
      </output>
      <QuizExplanation html={quiz.explanationHtml} visible={revealed} />
    </div>
  );
}
