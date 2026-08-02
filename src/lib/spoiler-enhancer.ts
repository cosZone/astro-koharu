const MAX_COMPONENT_SYNC_FRAMES = 60;

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
    spoiler.removeAttribute('tabindex');
    spoiler.removeAttribute('aria-label');
    spoiler.removeAttribute('aria-pressed');
  }

  function installSpoilerFallback(spoiler: HTMLElement) {
    if (spoiler.dataset.fallbackReady === 'true') return;

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
    const spoilers = Array.from(root.querySelectorAll<HTMLElement>('spoiler-span'));
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

/** Lazily enhance Shoka and Telegram spoiler elements within a rendered subtree. */
export function enhanceSpoilers(root: ParentNode = document) {
  enhanceSpoilersInBrowser(root);
}
