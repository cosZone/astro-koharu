import { parseQuizElement } from '@lib/quiz';
import { useMemo } from 'react';
import { FillBlankQuiz } from './quiz/FillBlankQuiz';
import { MultiChoiceQuiz } from './quiz/MultiChoiceQuiz';
import { SingleChoiceQuiz } from './quiz/SingleChoiceQuiz';
import { TrueFalseQuiz } from './quiz/TrueFalseQuiz';

interface QuizBlockProps {
  element: HTMLElement;
}

export function QuizBlock({ element }: QuizBlockProps) {
  const quiz = useMemo(() => {
    try {
      return parseQuizElement(element);
    } catch {
      return null;
    }
  }, [element]);

  if (!quiz) {
    return (
      <div className="not-prose my-4 rounded-xl border border-destructive/50 bg-card p-4 text-muted-foreground text-sm">
        题目解析失败
      </div>
    );
  }

  return (
    <div className="not-prose my-4 rounded-xl border bg-card p-4 shadow-sm">
      {(() => {
        switch (quiz.type) {
          case 'single':
            return <SingleChoiceQuiz quiz={quiz} />;
          case 'multi':
            return <MultiChoiceQuiz quiz={quiz} />;
          case 'trueFalse':
            return <TrueFalseQuiz quiz={quiz} />;
          case 'fill':
            return <FillBlankQuiz quiz={quiz} />;
          default:
            return null;
        }
      })()}
    </div>
  );
}
