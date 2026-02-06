/**
 * Quiz block interactive component.
 * Enhances quiz list items (marked with .quiz/.options/.correct classes)
 * with click-to-answer interactivity.
 */

import { cn } from '@lib/utils';
import { useCallback, useMemo, useState } from 'react';

interface QuizBlockProps {
  /** The quiz list item element from the DOM */
  element: HTMLElement;
}

export function QuizBlock({ element }: QuizBlockProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Cache DOM queries — element ref is stable so this only runs once
  const { options, correctIndex } = useMemo(() => {
    const elements = Array.from(element.querySelectorAll('li'));
    return {
      options: elements.map((li) => li.innerHTML.replace(/<ul.*$/s, '')),
      correctIndex: elements.findIndex((li) => li.classList.contains('correct')),
    };
  }, [element]);

  const handleSelect = useCallback(
    (index: number) => {
      if (revealed) return;
      setSelectedIndex(index);
      setRevealed(true);
    },
    [revealed],
  );

  return (
    <div className="quiz-interactive">
      {options.map((optionHtml, index) => {
        const isCorrect = index === correctIndex;
        const isSelected = index === selectedIndex;
        const showResult = revealed;

        return (
          <button
            type="button"
            // biome-ignore lint/suspicious/noArrayIndexKey: Quiz options are static, never reordered
            key={index}
            className={cn(
              'quiz-option w-full cursor-pointer rounded-md border p-2 text-left transition-colors',
              !showResult && 'hover:border-primary/30 hover:bg-primary/5',
              showResult && isCorrect && 'border-green-500 bg-green-50 dark:bg-green-950/30',
              showResult && isSelected && !isCorrect && 'border-red-500 bg-red-50 dark:bg-red-950/30',
              showResult && !isSelected && !isCorrect && 'opacity-50',
            )}
            onClick={() => handleSelect(index)}
            disabled={revealed}
          >
            <span className="mr-2 font-mono text-muted-foreground text-sm">{String.fromCharCode(65 + index)}.</span>
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Content is from build-time rendered Markdown, safe */}
            <span dangerouslySetInnerHTML={{ __html: optionHtml }} />
            {showResult && isCorrect && <span className="ml-2 text-green-600">✓</span>}
            {showResult && isSelected && !isCorrect && <span className="ml-2 text-red-600">✗</span>}
          </button>
        );
      })}
      {revealed && (
        <div
          className={cn(
            'mt-2 rounded-md p-2 text-sm',
            selectedIndex === correctIndex
              ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300'
              : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300',
          )}
        >
          {selectedIndex === correctIndex ? '回答正确！' : `回答错误。正确答案是 ${String.fromCharCode(65 + correctIndex)}。`}
        </div>
      )}
    </div>
  );
}
