import { isMotionDisabled, subscribeMotionLevel } from '@lib/motion-level';

const MAX_COMPONENT_SYNC_FRAMES = 60;

function keepProgrammaticFocus(spoiler: HTMLElement) {
  spoiler.tabIndex = -1;
  spoiler.addEventListener('blur', () => spoiler.removeAttribute('tabindex'), { once: true });
}

interface SpoilerEnhancerDependencies {
  componentIsDefined(): boolean;
  loadComponent(): Promise<unknown>;
  queryDocumentSpoilers(): HTMLElement[];
  requestFrame(callback: FrameRequestCallback): number;
  reportLoadError(error: unknown): void;
}

/** @internal Test seam for exercising the lazy custom-element lifecycle without a browser dependency. */
export function __createSpoilerEnhancer(dependencies: SpoilerEnhancerDependencies) {
  const fallbackCleanup = new WeakMap<HTMLElement, () => void>();
  let spoilerJsPromise: Promise<unknown> | null = null;

  function revealLabelFor(spoiler: HTMLElement): string {
    return spoiler.closest<HTMLElement>('[data-spoiler-reveal-label]')?.dataset.spoilerRevealLabel ?? 'Reveal spoiler';
  }

  function clearSpoilerFallback(spoiler: HTMLElement) {
    fallbackCleanup.get(spoiler)?.();
    fallbackCleanup.delete(spoiler);
    delete spoiler.dataset.fallbackReady;
    spoiler.removeAttribute('role');
    // Keep the host focused until the asynchronously hydrated shadow control can take over.
    if (typeof document !== 'undefined' && document.activeElement === spoiler) keepProgrammaticFocus(spoiler);
    else spoiler.removeAttribute('tabindex');
    spoiler.removeAttribute('aria-label');
    spoiler.removeAttribute('aria-pressed');
  }

  function installSpoilerFallback(spoiler: HTMLElement) {
    if (spoiler.dataset.fallbackReady === 'true' || spoiler.dataset.fallbackRevealed === 'true') return;

    spoiler.dataset.fallbackReady = 'true';
    spoiler.setAttribute('role', 'button');
    spoiler.setAttribute('tabindex', '0');
    spoiler.setAttribute('aria-label', revealLabelFor(spoiler));
    spoiler.setAttribute('aria-pressed', 'false');

    function reveal() {
      if (spoiler.dataset.fallbackRevealed === 'true') return;
      spoiler.dataset.fallbackRevealed = 'true';
      clearSpoilerFallback(spoiler);
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      reveal();
    }

    spoiler.addEventListener('click', reveal);
    spoiler.addEventListener('keydown', handleKeydown);
    fallbackCleanup.set(spoiler, () => {
      spoiler.removeEventListener('click', reveal);
      spoiler.removeEventListener('keydown', handleKeydown);
    });
  }

  function syncDefinedSpoiler(spoiler: HTMLElement): boolean {
    const control = spoiler.shadowRoot?.querySelector<HTMLElement>('[role="button"]');
    if (!control) return false;
    if (typeof document !== 'undefined' && document.activeElement === spoiler) {
      control.focus({ preventScroll: true });
    }

    // spoilerjs currently ships an English-only accessible name. Keep using its
    // native interaction while supplying the locale owned by the surrounding
    // article or Moments card.
    if (control.hasAttribute('aria-label')) {
      control.setAttribute('aria-label', revealLabelFor(spoiler));
    }

    // A user may reveal the lightweight fallback before the lazy component has
    // registered. Transfer that intent into spoilerjs instead of hiding the text
    // again when the custom element upgrades.
    if (spoiler.dataset.fallbackRevealed === 'true') {
      delete spoiler.dataset.fallbackRevealed;
      control.click();
    }

    return true;
  }

  function installDefinedSpoilerEnhancement(spoiler: HTMLElement) {
    if (spoiler.dataset.definedEnhancementReady === 'true') {
      syncDefinedSpoiler(spoiler);
      return;
    }

    spoiler.dataset.definedEnhancementReady = 'true';
    let syncFrame = 0;
    const scheduleSync = () => {
      syncFrame = 0;
      const sync = () => {
        if (!spoiler.isConnected || syncDefinedSpoiler(spoiler)) return;
        syncFrame += 1;
        if (syncFrame < MAX_COMPONENT_SYNC_FRAMES) dependencies.requestFrame(sync);
      };
      dependencies.requestFrame(sync);
    };

    // Stencil rerenders the internal control as reveal state changes. Resync on
    // both pointer and keyboard activation so that transient states stay local.
    spoiler.addEventListener('click', scheduleSync);
    spoiler.addEventListener('keydown', scheduleSync);
    scheduleSync();
  }

  function enhanceDefinedSpoilers(spoilers: HTMLElement[]) {
    for (const spoiler of spoilers) installDefinedSpoilerEnhancement(spoiler);
  }

  return function enhanceSpoilers(root: ParentNode) {
    const spoilers: HTMLElement[] = [];
    for (const spoiler of root.querySelectorAll<HTMLElement>('spoiler-span, [data-static-spoiler]')) {
      if (spoiler.hasAttribute('data-static-spoiler')) {
        installSpoilerFallback(spoiler);
      } else {
        spoilers.push(spoiler);
      }
    }
    if (spoilers.length === 0) return;

    if (dependencies.componentIsDefined()) {
      enhanceDefinedSpoilers(spoilers);
      return;
    }

    for (const spoiler of spoilers) installSpoilerFallback(spoiler);

    if (!spoilerJsPromise) {
      spoilerJsPromise = dependencies
        .loadComponent()
        .then(() => {
          const activeSpoilers = dependencies.queryDocumentSpoilers();
          for (const spoiler of activeSpoilers) clearSpoilerFallback(spoiler);
          enhanceDefinedSpoilers(activeSpoilers);
        })
        .catch((error) => {
          spoilerJsPromise = null;
          dependencies.reportLoadError(error);
        });
    }
  };
}

const enhanceSpoilersInBrowser = __createSpoilerEnhancer({
  componentIsDefined: () => Boolean(customElements.get('spoiler-span')),
  loadComponent: () => import('spoilerjs/spoiler-span'),
  queryDocumentSpoilers: () => Array.from(document.querySelectorAll<HTMLElement>('spoiler-span')),
  requestFrame: (callback) => requestAnimationFrame(callback),
  reportLoadError: (error) => console.error('[content] Failed to load spoilerjs:', error),
});

let observingMotion = false;

function replaceSpoiler(spoiler: HTMLElement, isStatic: boolean) {
  const active = document.activeElement;
  spoiler.dispatchEvent(new Event('koharu:before-spoiler-replace', { bubbles: true }));
  const replacement = document.createElement(isStatic ? 'span' : 'spoiler-span');
  const focusedTarget =
    active === spoiler ? replacement : active instanceof HTMLElement && spoiler.contains(active) ? active : null;
  for (const { name, value } of spoiler.attributes) replacement.setAttribute(name, value);
  replacement.classList.remove('hydrated');

  const revealed =
    spoiler.dataset.fallbackRevealed === 'true' || Boolean(spoiler.shadowRoot?.querySelector('.revealed, .revealing'));
  delete replacement.dataset.fallbackReady;
  delete replacement.dataset.definedEnhancementReady;
  replacement.removeAttribute('role');
  replacement.removeAttribute('tabindex');
  replacement.removeAttribute('aria-label');
  replacement.removeAttribute('aria-pressed');
  if (revealed) replacement.dataset.fallbackRevealed = 'true';
  if (isStatic) {
    replacement.dataset.staticSpoiler = '';
  } else {
    delete replacement.dataset.staticSpoiler;
  }

  // Disconnecting spoilerjs releases its body canvases, RAF and window listeners.
  // Preserve the actual content nodes so links and other enhancements survive.
  if (isStatic && spoiler.matches(':defined') && !spoiler.shadowRoot?.childElementCount) {
    // spoilerjs 0.2.0 can run its queued first componentDidLoad after disconnection,
    // reattaching listeners. Its custom-elements build has no componentOnReady;
    // Stencil marks the host hydrated in the same task, before that lifecycle call.
    const observer = new MutationObserver(() => {
      if (!spoiler.classList.contains('hydrated')) return;
      observer.disconnect();
      if (!spoiler.isConnected) {
        const detached = spoiler as HTMLElement & { disconnectedCallback?: () => void };
        detached.disconnectedCallback?.();
      }
    });
    observer.observe(spoiler, { attributes: true, attributeFilter: ['class'] });
  }
  replacement.append(...spoiler.childNodes);
  spoiler.replaceWith(replacement);
  return { replacement, focusedTarget };
}

function syncSpoilerMotion(root: ParentNode) {
  const replacements: ReturnType<typeof replaceSpoiler>[] = [];
  if (isMotionDisabled() || document.hidden) {
    for (const spoiler of root.querySelectorAll<HTMLElement>('spoiler-span')) {
      replacements.push(replaceSpoiler(spoiler, true));
    }
  } else {
    for (const spoiler of root.querySelectorAll<HTMLElement>('[data-static-spoiler]')) {
      // Revealed text has no effect left to restart.
      if (spoiler.dataset.fallbackRevealed !== 'true') replacements.push(replaceSpoiler(spoiler, false));
    }
  }
  return replacements;
}

function restoreSpoilerFocus(spoiler: HTMLElement, previous: HTMLElement, attempt = 0) {
  if (!spoiler.isConnected || spoiler.closest('[inert]')) return;
  // A delayed custom-element upgrade must not steal focus after the reader has moved on.
  if (document.activeElement !== document.body && document.activeElement !== spoiler) return;
  if (previous !== spoiler && getComputedStyle(previous).visibility === 'visible') {
    previous.focus({ preventScroll: true });
    if (document.activeElement === previous) return;
  }
  const control = spoiler.shadowRoot?.querySelector<HTMLElement>('[role="button"]');
  if (control) {
    control.focus({ preventScroll: true });
  } else if (spoiler.hasAttribute('data-static-spoiler') || spoiler.dataset.fallbackReady === 'true') {
    if (!spoiler.hasAttribute('tabindex')) {
      keepProgrammaticFocus(spoiler);
    }
    spoiler.focus({ preventScroll: true });
  } else if (attempt < MAX_COMPONENT_SYNC_FRAMES) {
    requestAnimationFrame(() => restoreSpoilerFocus(spoiler, previous, attempt + 1));
  }
}

/** Lazily enhance Shoka and Telegram spoiler elements within a rendered subtree. */
export function enhanceSpoilers(root: ParentNode = document) {
  if (!observingMotion) {
    observingMotion = true;
    subscribeMotionLevel(() => enhanceSpoilers(document));
    document.addEventListener('visibilitychange', () => enhanceSpoilers(document));
  }
  const replacements = syncSpoilerMotion(root);
  enhanceSpoilersInBrowser(root);
  for (const { replacement, focusedTarget } of replacements) {
    replacement.dispatchEvent(new Event('koharu:spoiler-replaced', { bubbles: true }));
    if (focusedTarget) restoreSpoilerFocus(replacement, focusedTarget);
  }
}
