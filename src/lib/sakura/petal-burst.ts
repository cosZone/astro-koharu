/**
 * A small burst of sakura petals where an interactive element is pressed (lively motion level only).
 *
 * The layer is appended to <html> rather than <body> so a burst that triggers a ClientRouter
 * navigation keeps playing across the page swap.
 */

import { readMotionLevel } from '@lib/motion-level';
import { PETAL_COLORS, PETAL_MASK } from './petal';

const INTERACTIVE = 'a[href], button, [role="button"], summary, label[for]';
const EXCLUDED = 'input, textarea, select, [contenteditable="true"], [data-no-petals]';
const PETALS_PER_BURST = 6;

let layer: HTMLDivElement | null = null;

function ensureLayer(): HTMLDivElement {
  if (layer?.isConnected) return layer;
  layer = document.createElement('div');
  layer.className = 'petal-burst-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.setProperty('--petal-mask', PETAL_MASK);
  document.documentElement.append(layer);
  return layer;
}

function burstAt(x: number, y: number): void {
  const host = ensureLayer();
  const offset = Math.random() * Math.PI * 2;
  for (let i = 0; i < PETALS_PER_BURST; i++) {
    const petal = document.createElement('span');
    const [tip, base] = PETAL_COLORS[i % PETAL_COLORS.length];
    const size = 8 + Math.random() * 6;
    petal.className = 'petal-burst';
    petal.style.width = `${size}px`;
    petal.style.height = `${size * 1.2}px`;
    petal.style.background = `linear-gradient(${tip}, ${base})`;
    host.append(petal);

    const angle = offset + (i / PETALS_PER_BURST) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
    const distance = 24 + Math.random() * 22;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const spin = (Math.random() - 0.5) * 560;
    const at = (px: number, py: number, rotate: number, scale: number) =>
      `translate(${px}px, ${py}px) translate(-50%, -50%) rotate(${rotate}deg) scale(${scale})`;

    petal
      .animate(
        [
          { transform: at(x, y, 0, 0.3), opacity: 1 },
          { transform: at(x + dx, y + dy, spin * 0.6, 1), opacity: 0.95, offset: 0.45 },
          // Petals keep drifting and sink a little as they fade, like falling blossoms.
          { transform: at(x + dx * 1.3, y + dy * 1.3 + 26, spin, 0.7), opacity: 0 },
        ],
        { duration: 680 + Math.random() * 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      )
      .finished.catch(() => {})
      .finally(() => petal.remove());
  }
}

export function setupPetalBurst(): void {
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button !== 0 || !event.isPrimary) return;
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(INTERACTIVE) || target.closest(EXCLUDED)) return;
      if (readMotionLevel() !== 'lively') return;
      burstAt(event.clientX, event.clientY);
    },
    { passive: true },
  );
}
