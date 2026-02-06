/**
 * Pure utility functions for content enhancement.
 * Extracted from code-block-enhancer.ts for reuse across React components.
 */

/**
 * Extract language from a Shiki-rendered pre element.
 * Checks data-language, then language-* class, then defaults to 'text'.
 */
export function extractLanguage(preElement: HTMLElement): string {
  if (preElement.classList.contains('mermaid')) return 'mermaid';

  const dataLang = preElement.getAttribute('data-language');
  if (dataLang) return dataLang;

  const codeElement = preElement.querySelector('code');
  if (codeElement) {
    const langClass = codeElement.className.split(' ').find((cls) => cls.startsWith('language-'));
    if (langClass) return langClass.replace('language-', '');
  }

  return 'text';
}

/** Extract plain text code content */
export function extractCode(preElement: HTMLElement): string {
  return preElement.querySelector('code')?.textContent || '';
}

/** Extract HTML code content (preserving syntax highlighting) */
export function extractCodeHTML(preElement: HTMLElement): string {
  return preElement.querySelector('code')?.innerHTML || '';
}

/** Extract the className of the code element (for fullscreen display) */
export function extractCodeClassName(preElement: HTMLElement): string {
  return preElement.querySelector('code')?.className || '';
}

/** Check if a pre element contains infographic syntax */
export function isInfographicBlock(preElement: HTMLElement): boolean {
  const content = preElement.querySelector('code')?.textContent?.trim() || preElement.textContent?.trim() || '';
  return content.startsWith('infographic ');
}

/**
 * Wrap a pre element in a container div and return the wrapper.
 * Used by ContentEnhancer to create portal targets.
 */
export function wrapElement(preElement: HTMLElement, wrapperClass: string): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.className = wrapperClass;

  // Create a toolbar mount point
  const toolbarMount = document.createElement('div');
  toolbarMount.className = `${wrapperClass}-toolbar-mount`;

  preElement.parentNode?.insertBefore(wrapper, preElement);
  wrapper.appendChild(toolbarMount);
  wrapper.appendChild(preElement);

  return wrapper;
}
