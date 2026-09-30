/**
 * Shared-element choreography for Astro's ClientRouter.
 *
 * Elements marked with `data-morph` carry a `transition:name` that pairs them across pages
 * (post card title ⇄ post cover title). Only a pair with both ends on screen keeps its name;
 * every other marked element is unnamed for that navigation, so unpaired titles never
 * linger above the page cross-fade and a far-away end never swoops across the viewport.
 * The incoming end skips its load-time `motion-rise` so the morph is its only motion.
 */

const MORPH_SELECTOR = '[data-morph]';

export function postTitleMorphName(slug: string): string {
  return `post-title-${slug}`;
}

function morphElements(root: ParentNode): NodeListOf<HTMLElement> {
  return root.querySelectorAll<HTMLElement>(MORPH_SELECTOR);
}

function isOnScreen(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
}

function unname(element: HTMLElement): void {
  element.style.viewTransitionName = 'none';
}

export function setupMorphTransitions(): void {
  let pairs = new Set<string>();

  document.addEventListener('astro:before-preparation', (event) => {
    const load = event.loader;
    // Decide the pairs once the next page is fetched but before the old-state snapshot.
    event.loader = async () => {
      await load();
      const incoming = new Set(Array.from(morphElements(event.newDocument), (element) => element.dataset.morph));
      pairs = new Set();
      for (const element of morphElements(document)) {
        element.style.viewTransitionName = '';
        const name = element.dataset.morph ?? '';
        if (incoming.has(name) && isOnScreen(element)) pairs.add(name);
        else unname(element);
      }
    };
  });

  document.addEventListener('astro:before-swap', (event) => {
    for (const element of morphElements(event.newDocument)) {
      if (pairs.has(element.dataset.morph ?? '')) element.classList.remove('motion-rise');
      else unname(element);
    }
  });

  // The new DOM is in place and scroll is restored; the new-state snapshot is still to come.
  document.addEventListener('astro:after-swap', () => {
    for (const element of morphElements(document)) {
      if (pairs.has(element.dataset.morph ?? '') && !isOnScreen(element)) unname(element);
    }
  });
}
