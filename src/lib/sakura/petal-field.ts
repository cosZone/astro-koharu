/**
 * Canvas2D sakura petal field for page covers.
 *
 * Each petal tumbles (fake 3D flip via a vertical squash), sways on its own phase and
 * rides a slowly shifting breeze. Pointer movement brushes nearby petals along the
 * pointer's velocity. Rendering is one `drawImage` per petal from pre-rendered sprites.
 */

import { createPetalSprites, PETAL_VIEWBOX } from './petal';

interface Petal {
  x: number;
  y: number;
  fall: number;
  size: number;
  depth: number;
  rotation: number;
  spin: number;
  flip: number;
  flipSpeed: number;
  sway: number;
  swaySpeed: number;
  swayAmp: number;
  sprite: number;
  alpha: number;
  life: number;
  pushX: number;
  pushY: number;
}

const MAX_DPR = 2;
const SPRITE_UNIT = 3;
const BRUSH_RADIUS = 120;
const BOTTOM_FADE = 90;
const MAX_PUSH = 260;

const random = (min: number, max: number) => min + Math.random() * (max - min);

export class PetalField {
  private readonly ctx: CanvasRenderingContext2D;
  private sprites: HTMLCanvasElement[] = [];
  private petals: Petal[] = [];
  private width = 0;
  private height = 0;
  private dpr = 1;
  private frame = 0;
  private lastTime = 0;
  private clock = 0;
  private pointer = { x: -9999, y: -9999, vx: 0, vy: 0, time: 0 };

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
  }

  get running(): boolean {
    return this.frame !== 0;
  }

  resize(width: number, height: number): void {
    if (width === this.width && height === this.height) return;
    const firstLayout = this.width === 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    if (this.sprites.length === 0) this.sprites = createPetalSprites(SPRITE_UNIT * this.dpr);

    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const density = (width * height) / (coarse ? 30000 : 24000);
    const target = Math.round(Math.min(34, Math.max(12, density)));
    while (this.petals.length < target) this.petals.push(this.spawn(firstLayout));
    this.petals.length = target;
  }

  /** Pointer position in client coordinates; the field converts it to canvas space each frame. */
  brush(clientX: number, clientY: number): void {
    const now = performance.now();
    const dt = Math.max(16, now - this.pointer.time) / 1000;
    if (this.pointer.time !== 0) {
      this.pointer.vx = (clientX - this.pointer.x) / dt;
      this.pointer.vy = (clientY - this.pointer.y) / dt;
    }
    this.pointer.x = clientX;
    this.pointer.y = clientY;
    this.pointer.time = now;
  }

  start(): void {
    if (this.frame !== 0) return;
    this.lastTime = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  stop(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  clear(): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private spawn(scatter: boolean): Petal {
    const depth = random(0.45, 1);
    return {
      x: random(-40, this.width + 40),
      y: scatter ? random(-40, this.height * 0.9) : random(-80, -20),
      fall: random(22, 44),
      size: random(0.8, 1.3) * (0.5 + depth * 0.5),
      depth,
      rotation: random(0, Math.PI * 2),
      spin: random(-1.1, 1.1),
      flip: random(0, Math.PI * 2),
      flipSpeed: random(1.2, 2.6),
      sway: random(0, Math.PI * 2),
      swaySpeed: random(0.6, 1.4),
      swayAmp: random(10, 28),
      sprite: Math.floor(random(0, this.sprites.length || 4)),
      alpha: random(0.55, 0.95) * (0.55 + depth * 0.45),
      life: scatter ? random(0.2, 1) : 0,
      pushX: 0,
      pushY: 0,
    };
  }

  private readonly tick = (now: number) => {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.clock += dt;
    this.update(dt);
    this.draw();
    this.frame = requestAnimationFrame(this.tick);
  };

  private update(dt: number): void {
    const breeze = 14 + Math.sin(this.clock * 0.13) * 10 + Math.sin(this.clock * 0.37) * 4;
    const pointerFresh = this.pointer.time !== 0 && performance.now() - this.pointer.time < 120;
    // The cover's position only matters while a recent pointer movement is brushing petals.
    const rect = pointerFresh ? this.canvas.getBoundingClientRect() : null;
    const px = this.pointer.x - (rect?.left ?? 0);
    const py = this.pointer.y - (rect?.top ?? 0);
    const decay = Math.exp(-2.6 * dt);

    for (const petal of this.petals) {
      if (pointerFresh) {
        const distance = Math.hypot(petal.x - px, petal.y - py);
        if (distance < BRUSH_RADIUS) {
          const strength = (1 - distance / BRUSH_RADIUS) * 0.02;
          petal.pushX = Math.max(-MAX_PUSH, Math.min(MAX_PUSH, petal.pushX + this.pointer.vx * strength));
          petal.pushY = Math.max(-MAX_PUSH, Math.min(MAX_PUSH, petal.pushY + this.pointer.vy * strength));
        }
      }
      petal.pushX *= decay;
      petal.pushY *= decay;
      petal.sway += petal.swaySpeed * dt;
      petal.flip += petal.flipSpeed * dt;
      petal.rotation += petal.spin * dt;
      petal.x += (breeze * petal.depth + Math.cos(petal.sway) * petal.swayAmp + petal.pushX) * dt;
      petal.y += (petal.fall * petal.depth + Math.sin(petal.sway * 0.5) * 6 + petal.pushY) * dt;
      petal.life = Math.min(1, petal.life + dt / 1.4);

      if (petal.y > this.height + 30 || petal.x > this.width + 60 || petal.x < -80) {
        Object.assign(petal, this.spawn(false));
        petal.x = random(-60, this.width * 0.9);
      }
    }
  }

  private draw(): void {
    const { ctx, dpr } = this;
    this.clear();
    for (const petal of this.petals) {
      const sprite = this.sprites[petal.sprite];
      if (!sprite) continue;
      const fadeOut = Math.min(1, Math.max(0, (this.height - petal.y) / BOTTOM_FADE));
      const alpha = petal.alpha * petal.life * fadeOut;
      if (alpha <= 0.01) continue;
      const squash = 0.25 + 0.75 * Math.abs(Math.cos(petal.flip));
      const scale = petal.size / SPRITE_UNIT;
      const cos = Math.cos(petal.rotation);
      const sin = Math.sin(petal.rotation);
      ctx.globalAlpha = alpha;
      ctx.setTransform(cos * scale, sin * scale, -sin * scale * squash, cos * scale * squash, petal.x * dpr, petal.y * dpr);
      ctx.drawImage(sprite, (-PETAL_VIEWBOX.width * SPRITE_UNIT * dpr) / 2, (-PETAL_VIEWBOX.height * SPRITE_UNIT * dpr) / 2);
    }
    ctx.globalAlpha = 1;
  }
}
