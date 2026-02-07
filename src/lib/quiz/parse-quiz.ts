import type { ParsedQuiz, QuizOption, QuizType } from './types';

/** Detect quiz type from the element's classList and source content */
export function detectQuizType(el: HTMLElement, source: HTMLElement): QuizType {
  if (el.classList.contains('fill')) return 'fill';
  if (el.classList.contains('multi')) return 'multi';

  // trueFalse: has .quiz but no child <ul> options and not fill
  const hasOptionsList = source.querySelector(':scope > ul') !== null;
  if (!hasOptionsList) return 'trueFalse';

  return 'single';
}

/** Extract question HTML by cloning the element and removing <ul> and <blockquote> children */
export function extractQuestionHtml(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement;
  // Remove option lists and explanation blockquotes from the clone
  for (const child of Array.from(clone.children)) {
    if (child.tagName === 'UL' || child.tagName === 'OL' || child.tagName === 'BLOCKQUOTE') {
      child.remove();
    }
  }
  return clone.innerHTML.trim();
}

/** Extract options from child <ul> list items */
export function extractOptions(el: HTMLElement): QuizOption[] {
  const ul = el.querySelector(':scope > ul');
  if (!ul) return [];

  return Array.from(ul.querySelectorAll(':scope > li')).map((li) => ({
    html: li.innerHTML,
    isCorrect: li.classList.contains('correct'),
  }));
}

/** Extract explanation HTML from child <blockquote> */
export function extractExplanation(el: HTMLElement): string | null {
  const blockquote = el.querySelector(':scope > blockquote');
  return blockquote ? blockquote.innerHTML : null;
}

/** Extract gap answers from span.gap elements (outside blockquote) */
export function extractGaps(el: HTMLElement): string[] {
  // Only look at direct content gaps, not those inside blockquote
  const gaps: string[] = [];
  for (const span of Array.from(el.querySelectorAll('span.gap'))) {
    // Skip gaps inside blockquote (those are in explanation)
    if (span.closest('blockquote')) continue;
    gaps.push(span.textContent || '');
  }
  return gaps;
}

/** Extract mistake items from blockquote span.mistake elements */
export function extractMistakes(el: HTMLElement): string[] {
  const blockquote = el.querySelector(':scope > blockquote');
  if (!blockquote) return [];
  return Array.from(blockquote.querySelectorAll('span.mistake')).map((span) => span.textContent || '');
}

/** Get the source element for parsing (hidden wrapper or the li itself) */
function getSource(el: HTMLElement): HTMLElement {
  return (el.querySelector(':scope > .quiz-original') as HTMLElement) || el;
}

/** Main parse function: extracts all structured data from a quiz <li> element */
export function parseQuizElement(el: HTMLElement): ParsedQuiz {
  const source = getSource(el);
  const type = detectQuizType(el, source);

  return {
    type,
    questionHtml: extractQuestionHtml(source),
    options: type === 'single' || type === 'multi' ? extractOptions(source) : [],
    correctAnswer: type === 'trueFalse' ? el.classList.contains('true') : undefined,
    gaps: type === 'fill' ? extractGaps(source) : [],
    mistakes: type === 'fill' ? extractMistakes(source) : [],
    explanationHtml: extractExplanation(source),
  };
}
