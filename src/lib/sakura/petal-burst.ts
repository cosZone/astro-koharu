/**
 * A small burst of sakura petals where an interactive element is pressed (lively motion level only).
 *
 * Each petal's flight is simulated up front (a toss, air drag, then a slow fall with sway, spin and a
 * flip about its long axis) and baked into transform/opacity keyframes, so the compositor plays it
 * even while a navigation keeps the main thread busy.
 *
 * The layer lives on <html> so it survives ClientRouter swaps. While petals are airborne it carries its
 * own view-transition-name, so a page transition shows it as a live group above both pages instead of
 * freezing it into the old snapshot; its animations hold still while the page itself is frozen, then
 * resume exactly where they stopped.
 */

import { readMotionLevel, subscribeMotionLevel } from '@lib/motion-level';
import { PETAL_COLORS, PETAL_MASK } from './petal';

const INTERACTIVE = 'a[href], button, [role="button"], summary, label[for]';
const EXCLUDED = 'input, textarea, select, [contenteditable="true"], [data-no-petals]';
const PETALS_PER_BURST = 7;
const SAMPLE_MS = 1000 / 30;
const LAYER_NAME = 'petal-burst';

let layer: HTMLDivElement | null = null;
const flights = new Set<Animation>();

const random = (min: number, max: number) => min + Math.random() * (max - min);
const smoothstep = (t: number) => t * t * (3 - 2 * t);

function ensureLayer(): HTMLDivElement {
  if (layer?.isConnected) return layer;
  layer = document.createElement('div');
  layer.className = 'petal-burst-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.setProperty('--petal-mask', PETAL_MASK);
  document.documentElement.append(layer);
  return layer;
}

/** One petal tossed from (x, y), sampled into keyframes. Positions are the petal's center in px. */
function simulateFlight(x: number, y: number, depth: number): { keyframes: Keyframe[]; duration: number } {
  const angle = -Math.PI / 2 + random(-1.25, 1.25);
  const speed = random(170, 340) * (0.75 + depth * 0.25);
  const drag = random(3.6, 4.6);
  const terminal = random(90, 125);
  const duration = random(1050, 1400);
  const sway = { amplitude: random(5, 12), frequency: random(4.5, 7.5), phase: random(0, Math.PI * 2) };
  const flip = { frequency: random(6.5, 10.5), phase: random(0, Math.PI * 2) };
  const spin = random(160, 420) * (Math.random() < 0.5 ? -1 : 1);
  const rotation = random(0, 360);

  let px = x + random(-3, 3);
  let py = y + random(-3, 3);
  let vx = Math.cos(angle) * speed;
  let vy = Math.sin(angle) * speed;
  const steps = Math.ceil(duration / SAMPLE_MS);
  const dt = duration / steps / 1000;
  const keyframes: Keyframe[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    const progress = i / steps;
    const pop = 1 - (1 - Math.min(1, t / 0.16)) ** 3;
    const scale = (0.35 + 0.65 * pop) * (1 - 0.18 * progress) * (0.7 + depth * 0.3);
    const cos = Math.cos(flip.phase + flip.frequency * t);
    const flipX = Math.sign(cos || 1) * Math.max(Math.abs(cos), 0.14);
    const drift = Math.sin(sway.phase + sway.frequency * t) * sway.amplitude * (1 - Math.exp(-3 * t));
    const angleDeg = rotation + (spin * (1 - Math.exp(-1.4 * t))) / 1.4;
    const opacity = progress < 0.45 ? 1 : 1 - smoothstep((progress - 0.45) / 0.55);
    keyframes.push({
      transform: `translate(${(px + drift).toFixed(1)}px, ${py.toFixed(1)}px) rotate(${angleDeg.toFixed(1)}deg) scale(${(scale * flipX).toFixed(3)}, ${scale.toFixed(3)})`,
      opacity: opacity.toFixed(3),
    });

    // Exact step for linear air drag: velocity relaxes toward rest sideways and toward the terminal fall speed.
    const decay = Math.exp(-drag * dt);
    px += (vx * (1 - decay)) / drag;
    py += terminal * dt + ((vy - terminal) * (1 - decay)) / drag;
    vx *= decay;
    vy = terminal + (vy - terminal) * decay;
  }
  return { keyframes, duration };
}

function burstAt(x: number, y: number): void {
  const host = ensureLayer();
  host.style.viewTransitionName = LAYER_NAME;
  for (let i = 0; i < PETALS_PER_BURST; i++) {
    const depth = random(0.35, 1);
    const size = 7 + depth * 6;
    const [tip, base] = PETAL_COLORS[i % PETAL_COLORS.length];
    const petal = document.createElement('span');
    petal.className = 'petal-burst';
    petal.style.width = `${size}px`;
    petal.style.height = `${size * 1.2}px`;
    petal.style.margin = `${-size * 0.6}px 0 0 ${-size / 2}px`;
    // The base color reaches further up than on the cover so the petals still read on white cards.
    petal.style.background = `linear-gradient(${tip}, ${base} 70%)`;
    host.append(petal);

    const { keyframes, duration } = simulateFlight(x, y, depth);
    const flight = petal.animate(keyframes, { duration, delay: random(0, 45), fill: 'backwards' });
    flights.add(flight);
    flight.finished
      .catch(() => {})
      .finally(() => {
        petal.remove();
        flights.delete(flight);
        if (flights.size === 0) host.style.removeProperty('view-transition-name');
      });
  }
}

/** Freeze airborne petals while a view transition has the page frozen, and resume them once it plays. */
export function holdPetalBurst(transition: ViewTransition): void {
  if (flights.size === 0) return;
  for (const flight of flights) flight.pause();
  const resume = () => {
    for (const flight of flights) flight.play();
  };
  transition.ready.then(resume, resume);
}

export function setupPetalBurst(): void {
  const stopWhenDisabled = () => {
    if (!document.hidden && readMotionLevel() === 'lively') return;
    for (const flight of flights) flight.cancel();
    flights.clear();
    layer?.replaceChildren();
    layer?.style.removeProperty('view-transition-name');
  };
  subscribeMotionLevel(stopWhenDisabled);
  document.addEventListener('visibilitychange', stopWhenDisabled);
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button !== 0 || !event.isPrimary) return;
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(INTERACTIVE) || target.closest(EXCLUDED)) return;
      if (document.hidden || readMotionLevel() !== 'lively') return;
      burstAt(event.clientX, event.clientY);
    },
    { passive: true },
  );
  document.addEventListener('astro:before-swap', (event) => holdPetalBurst(event.viewTransition));
}
