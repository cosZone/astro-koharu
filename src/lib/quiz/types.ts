export type QuizType = 'single' | 'multi' | 'trueFalse' | 'fill';

export interface QuizOption {
  /** innerHTML of the option <li> */
  html: string;
  /** Whether this option has the .correct class */
  isCorrect: boolean;
}

export interface ParsedQuiz {
  type: QuizType;
  /** Question HTML (excluding child <ul> and <blockquote>) */
  questionHtml: string;
  /** Options list (populated for single/multi, empty for others) */
  options: QuizOption[];
  /** True/false answer (only for trueFalse type) */
  correctAnswer?: boolean;
  /** Fill-in-the-blank answers (from span.gap textContent) */
  gaps: string[];
  /** Common mistakes (from span.mistake in blockquote) */
  mistakes: string[];
  /** Explanation HTML from blockquote, or null */
  explanationHtml: string | null;
}
