let lockedId: string | null = null;
let lockTimer: ReturnType<typeof setTimeout> | null = null;
let activeScrollEndHandler: (() => void) | null = null;

function cleanup() {
  if (lockTimer) clearTimeout(lockTimer);
  if (activeScrollEndHandler) {
    window.removeEventListener('scrollend', activeScrollEndHandler);
    activeScrollEndHandler = null;
  }
  lockedId = null;
  lockTimer = null;
}

/** Lock the active heading to a specific ID during programmatic scroll */
export function lockHeadingTo(id: string) {
  cleanup();
  lockedId = id;

  if ('onscrollend' in window) {
    activeScrollEndHandler = () => {
      cleanup();
    };
    window.addEventListener('scrollend', activeScrollEndHandler, { once: true });
    lockTimer = setTimeout(cleanup, 1500);
  } else {
    lockTimer = setTimeout(cleanup, 800);
  }
}

export function getLockedHeadingId(): string | null {
  return lockedId;
}

/** Reset lock state on page navigation — self-registered, no external call needed */
if (typeof document !== 'undefined') {
  document.addEventListener('astro:before-swap', cleanup);
}
