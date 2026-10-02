export interface LightboxTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface GesturePoint {
  x: number;
  y: number;
}

export interface LightboxGeometry {
  viewportWidth: number;
  viewportHeight: number;
  imageWidth: number;
  imageHeight: number;
  rotation: number;
}

export const LIGHTBOX_IDENTITY: LightboxTransform = { scale: 1, translateX: 0, translateY: 0 };
export const LIGHTBOX_DRAG_THRESHOLD = 8;

export function clampLightboxScale(scale: number): number {
  return Number.isFinite(scale) ? Math.max(1, Math.min(5, scale)) : 1;
}

export function lightboxPanBounds(scale: number, geometry: LightboxGeometry): GesturePoint {
  const angle = (geometry.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  const width = geometry.imageWidth * cos + geometry.imageHeight * sin;
  const height = geometry.imageWidth * sin + geometry.imageHeight * cos;
  return {
    x: Math.max(0, (width * scale - geometry.viewportWidth) / 2),
    y: Math.max(0, (height * scale - geometry.viewportHeight) / 2),
  };
}

export function boundLightboxTransform(transform: LightboxTransform, geometry: LightboxGeometry): LightboxTransform {
  const scale = clampLightboxScale(transform.scale);
  if (scale === 1) return LIGHTBOX_IDENTITY;
  const bounds = lightboxPanBounds(scale, geometry);
  return {
    scale,
    translateX: Math.max(-bounds.x, Math.min(bounds.x, transform.translateX)),
    translateY: Math.max(-bounds.y, Math.min(bounds.y, transform.translateY)),
  };
}

/** Points use viewport-centered coordinates, so the touched image pixel stays under the gesture. */
export function zoomLightboxAt(
  transform: LightboxTransform,
  targetScale: number,
  anchor: GesturePoint,
  nextAnchor = anchor,
): LightboxTransform {
  const scale = clampLightboxScale(targetScale);
  const factor = scale / transform.scale;
  return {
    scale,
    translateX: nextAnchor.x - (anchor.x - transform.translateX) * factor,
    translateY: nextAnchor.y - (anchor.y - transform.translateY) * factor,
  };
}

export function pointDistance(a: GesturePoint, b: GesturePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pointMidpoint(a: GesturePoint, b: GesturePoint): GesturePoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export type LightboxSwipe = { type: 'navigate'; direction: 1 | -1 } | { type: 'dismiss' } | null;

export function resolveLightboxSwipe(
  delta: GesturePoint,
  elapsed: number,
  viewport: { width: number; height: number },
): LightboxSwipe {
  const x = Math.abs(delta.x);
  const y = Math.abs(delta.y);
  const duration = Math.max(1, elapsed);
  if (x > y * 1.2) {
    const threshold = Math.max(48, Math.min(96, viewport.width * 0.18));
    if (x >= threshold || (x >= 28 && x / duration >= 0.45)) {
      return { type: 'navigate', direction: delta.x < 0 ? 1 : -1 };
    }
  } else if (delta.y > 0 && y > x * 1.2) {
    const threshold = Math.max(64, Math.min(120, viewport.height * 0.16));
    if (y >= threshold || (y >= 36 && y / duration >= 0.5)) return { type: 'dismiss' };
  }
  return null;
}
