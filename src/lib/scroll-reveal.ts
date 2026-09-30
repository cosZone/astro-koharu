/**
 * One-shot scroll reveals: `.motion-reveal` elements (lively and subtle) and the prose blocks
 * of `.motion-reveal-lively` (lively only) rise in the first time they enter the viewport.
 *
 * Only elements that start entirely below the fold are held back, so nothing already painted
 * flickers, and each element drops its animation once it has played. A jump (TOC link,
 * find-in-page) that lands on a screenful at once shows it as is. A CSS view timeline per
 * element looked the same but kept every animation and its composited layer alive for the whole
 * visit; on long posts that saturated the main thread and starved `client:idle` islands.
 */

import type { MotionLevel } from '@lib/config/types';
import { readMotionLevel, subscribeMotionLevel } from '@lib/motion-level';

const REVEAL_SELECTOR = '.motion-reveal';
const PROSE_SELECTOR = '.motion-reveal-lively > *';
const REVEAL_ANIMATIONS = new Set(['motion-rise', 'motion-fade']);
const INSTANT_BATCH = 3;

let selector = '';
let scannedBody: HTMLElement | null = null;
let intersections: IntersectionObserver | null = null;
let mutations: MutationObserver | null = null;

function selectorFor(level: MotionLevel): string {
  if (level === 'lively') return `${REVEAL_SELECTOR}, ${PROSE_SELECTOR}`;
  if (level === 'subtle') return REVEAL_SELECTOR;
  return '';
}

function release(element: HTMLElement): void {
  delete element.dataset.reveal;
  element.style.removeProperty('--reveal-i');
}

function onIntersect(entries: IntersectionObserverEntry[], observer: IntersectionObserver): void {
  const entering: HTMLElement[] = [];
  for (const entry of entries) {
    const element = entry.target as HTMLElement;
    if (element.dataset.reveal === undefined) {
      const below = entry.boundingClientRect.top >= (entry.rootBounds?.bottom ?? window.innerHeight);
      if (!entry.isIntersecting && below) element.dataset.reveal = 'pending';
      else observer.unobserve(element);
    } else if (entry.isIntersecting) {
      observer.unobserve(element);
      entering.push(element);
    }
  }

  if (entering.length > INSTANT_BATCH) {
    for (const element of entering) release(element);
    return;
  }
  entering.forEach((element, index) => {
    element.style.setProperty('--reveal-i', String(index));
    element.dataset.reveal = 'in';
  });
}

function track(element: Element): void {
  if (element instanceof HTMLElement && element.dataset.reveal === undefined) intersections?.observe(element);
}

function forget(element: HTMLElement): void {
  intersections?.unobserve(element);
  release(element);
}

/**
 * Inserted nodes: client-only islands rendering their items late, or content enhancers wrapping a
 * prose block (e.g. a `<pre>`) in a new element. The wrapper takes over the reveal of whatever was
 * moved into it, so nested blocks never rise twice.
 */
function adopt(node: Element): void {
  if (node.matches(selector)) {
    for (const inner of node.querySelectorAll<HTMLElement>('[data-reveal]')) forget(inner);
    track(node);
  } else if (node instanceof HTMLElement && node.dataset.reveal !== undefined) {
    forget(node);
  }
  for (const element of node.querySelectorAll(selector)) track(element);
}

function scan(): void {
  intersections?.disconnect();
  mutations?.disconnect();
  intersections = mutations = null;
  for (const element of document.querySelectorAll<HTMLElement>('[data-reveal]')) release(element);

  scannedBody = document.body;
  selector = selectorFor(readMotionLevel());
  if (!selector) return;

  // No inset margin: a held element must play as soon as any of it shows, even at the very end of the page.
  intersections = new IntersectionObserver(onIntersect);
  for (const element of document.querySelectorAll(selector)) track(element);

  mutations = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) if (node instanceof Element) adopt(node);
    }
  });
  mutations.observe(document.body, { childList: true, subtree: true });
}

function onAnimationEnd(event: AnimationEvent): void {
  const element = event.target;
  if (element instanceof HTMLElement && element.dataset.reveal === 'in' && REVEAL_ANIMATIONS.has(event.animationName)) {
    release(element);
  }
}

export function setupScrollReveal(): void {
  // A swapped-in page is scanned only after its view transition has played, never during the morph.
  let settled: Promise<unknown> = Promise.resolve();
  const scanNewPage = () => {
    const body = document.body;
    settled.then(() => {
      if (document.body === body && body !== scannedBody) scan();
    });
  };
  if (document.readyState !== 'loading') scanNewPage();
  document.addEventListener('DOMContentLoaded', scanNewPage);
  document.addEventListener('astro:before-swap', (event) => {
    settled = event.viewTransition.finished.catch(() => undefined);
  });
  document.addEventListener('astro:after-swap', scanNewPage);
  document.addEventListener('astro:page-load', scanNewPage);
  document.addEventListener('animationend', onAnimationEnd);
  document.addEventListener('animationcancel', onAnimationEnd);
  subscribeMotionLevel(() => {
    if (selectorFor(readMotionLevel()) !== selector) scan();
  });
}
