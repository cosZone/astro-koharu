export type QuizType = 'single' | 'multi' | 'trueFalse' | 'fill';

export interface QuizOption {
  /** innerHTML of the option <li> */
  html: string;
  /** Whether this option has the .correct class */
  isCorrect: boolean;
}

/** A segment of a fill-blank question: either an HTML fragment or a gap placeholder */
export type QuestionPart = { type: 'html'; content: string } | { type: 'gap'; answer: string; index: number };

export interface ParsedQuiz {
  type: QuizType;
  /** Question HTML (excluding child <ul> and <blockquote>) */
  questionHtml: string;
  /** Options list (populated for single/multi, empty for others) */
  options: QuizOption[];
  /** True/false answer (only for trueFalse type) */
  correctAnswer?: boolean;
  /** Structured question parts with inline gaps (only for fill type) */
  questionParts: QuestionPart[];
  /** Common mistakes (from span.mistake in blockquote) */
  mistakes: string[];
  /** Explanation HTML from blockquote, or null */
  explanationHtml: string | null;
}
