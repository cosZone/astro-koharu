import type { ParsedQuiz } from '@lib/quiz';
import { useCallback, useState } from 'react';
import { QuizBadge } from './QuizBadge';
import { QuizExplanation } from './QuizExplanation';
import { QuizGap } from './QuizGap';

export function FillBlankQuiz({ quiz }: { quiz: ParsedQuiz }) {
  const [revealedGaps, setRevealedGaps] = useState<Set<number>>(new Set());

  const revealGap = useCallback((index: number) => {
    setRevealedGaps((prev) => new Set(prev).add(index));
  }, []);

  const gapCount = quiz.questionParts.filter((p) => p.type === 'gap').length;
  const allRevealed = revealedGaps.size >= gapCount;

  return (
    <div className="space-y-3">
      <div>
        <QuizBadge type="fill" />
        <span>
          {quiz.questionParts.map((part, i) =>
            part.type === 'html' ? (
              // biome-ignore lint/security/noDangerouslySetInnerHtml: Content from build-time Markdown
              // biome-ignore lint/suspicious/noArrayIndexKey: Parts are static, never reordered
              <span key={i} dangerouslySetInnerHTML={{ __html: part.content }} />
            ) : (
              <QuizGap
                key={`gap-${part.index}`}
                answer={part.answer}
                revealed={revealedGaps.has(part.index)}
                onClick={() => revealGap(part.index)}
              />
            ),
          )}
        </span>
      </div>
      {quiz.mistakes.length > 0 && allRevealed && (
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-muted-foreground">易错项：</span>
          {quiz.mistakes.map((mistake) => (
            <QuizGap key={mistake} answer={mistake} revealed isMistake onClick={() => {}} />
          ))}
        </div>
      )}
      <QuizExplanation html={quiz.explanationHtml} visible={allRevealed} />
    </div>
  );
}
