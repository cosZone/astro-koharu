import type { ParsedQuiz } from '@lib/quiz';
import { useCallback, useMemo, useState } from 'react';
import { QuizBadge } from './QuizBadge';
import { QuizExplanation } from './QuizExplanation';
import { QuizGap } from './QuizGap';

export function FillBlankQuiz({ quiz }: { quiz: ParsedQuiz }) {
  const [revealedGaps, setRevealedGaps] = useState<Set<number>>(new Set());

  const revealGap = useCallback((index: number) => {
    setRevealedGaps((prev) => new Set(prev).add(index));
  }, []);

  const allRevealed = revealedGaps.size >= quiz.gaps.length;

  // Build question with interactive gaps replacing span.gap elements
  const questionParts = useMemo(() => {
    // Split question HTML around gap placeholders
    // The questionHtml contains <span class="gap">answer</span> elements
    const parts: { type: 'html' | 'gap'; content: string; index: number }[] = [];
    const gapRegex = /<span class="gap">[^<]*<\/span>/g;
    let lastIndex = 0;
    let gapIndex = 0;

    for (let match = gapRegex.exec(quiz.questionHtml); match !== null; match = gapRegex.exec(quiz.questionHtml)) {
      if (match.index > lastIndex) {
        parts.push({ type: 'html', content: quiz.questionHtml.slice(lastIndex, match.index), index: -1 });
      }
      parts.push({ type: 'gap', content: quiz.gaps[gapIndex] || '', index: gapIndex });
      gapIndex++;
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < quiz.questionHtml.length) {
      parts.push({ type: 'html', content: quiz.questionHtml.slice(lastIndex), index: -1 });
    }

    return parts;
  }, [quiz.questionHtml, quiz.gaps]);

  return (
    <div className="space-y-3">
      <div>
        <QuizBadge type="fill" />
        <span>
          {questionParts.map((part, i) =>
            part.type === 'html' ? (
              // biome-ignore lint/security/noDangerouslySetInnerHtml: Content from build-time Markdown
              // biome-ignore lint/suspicious/noArrayIndexKey: Parts are static, never reordered
              <span key={i} dangerouslySetInnerHTML={{ __html: part.content }} />
            ) : (
              <QuizGap
                key={`gap-${part.index}`}
                answer={part.content}
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
