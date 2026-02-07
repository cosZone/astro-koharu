import type { ParsedQuiz, QuestionPart, QuizOption, QuizType } from './types';

/**
 * Lightweight client-side HTML sanitizer for quiz content.
 * Strips event handler attributes (onclick, onerror, etc.) and javascript: URLs
 * from already-rendered Markdown HTML. Uses the browser DOM API to avoid bundling
 * the heavy sanitize-html library (~50KB) on the client.
 */
function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  for (const el of doc.querySelectorAll('*')) {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('on') || (attr.name === 'href' && attr.value.trimStart().startsWith('javascript:'))) {
        el.removeAttribute(attr.name);
      }
    }
  }
  // Remove <script> and <style> elements
  for (const el of doc.querySelectorAll('script, style')) el.remove();
  return doc.body.firstElementChild?.innerHTML ?? '';
}

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
  return sanitizeHtml(clone.innerHTML.trim());
}

/** Extract options from child <ul> list items */
export function extractOptions(el: HTMLElement): QuizOption[] {
  const ul = el.querySelector(':scope > ul');
  if (!ul) return [];

  return Array.from(ul.querySelectorAll(':scope > li')).map((li) => ({
    html: sanitizeHtml(li.innerHTML),
    isCorrect: li.classList.contains('correct'),
  }));
}

/** Extract explanation HTML from child <blockquote> */
export function extractExplanation(el: HTMLElement): string | null {
  const blockquote = el.querySelector(':scope > blockquote');
  return blockquote ? sanitizeHtml(blockquote.innerHTML) : null;
}

/**
 * Build structured question parts for fill-blank quizzes using DOM traversal.
 *
 * Clones the question content, replaces span.gap elements with sentinel markers,
 * then splits the resulting HTML to produce an interleaved array of HTML fragments
 * and gap placeholders. This avoids fragile regex matching against raw innerHTML.
 */
export function extractQuestionParts(el: HTMLElement): QuestionPart[] {
  const clone = el.cloneNode(true) as HTMLElement;
  // Remove <ul>, <ol>, <blockquote> from clone (same as extractQuestionHtml)
  for (const child of Array.from(clone.children)) {
    if (child.tagName === 'UL' || child.tagName === 'OL' || child.tagName === 'BLOCKQUOTE') {
      child.remove();
    }
  }

  // Replace each span.gap with a unique sentinel text node
  const SENTINEL = '\x00GAP\x00';
  const gaps: string[] = [];
  for (const span of Array.from(clone.querySelectorAll('span.gap'))) {
    gaps.push(span.textContent || '');
    const marker = document.createTextNode(`${SENTINEL}${gaps.length - 1}${SENTINEL}`);
    span.replaceWith(marker);
  }

  // Split the serialized HTML by sentinel markers
  const html = clone.innerHTML.trim();
  const parts: QuestionPart[] = [];
  const segments = html.split(SENTINEL);

  for (const segment of segments) {
    if (segment === '') continue;
    const gapIndex = Number(segment);
    if (Number.isInteger(gapIndex) && gapIndex >= 0 && gapIndex < gaps.length) {
      parts.push({ type: 'gap', answer: gaps[gapIndex], index: gapIndex });
    } else {
      parts.push({ type: 'html', content: segment });
    }
  }

  return parts;
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
    questionParts: type === 'fill' ? extractQuestionParts(source) : [],
    mistakes: type === 'fill' ? extractMistakes(source) : [],
    explanationHtml: extractExplanation(source),
  };
}
