/**
 * Geometry for zooming an article image into the lightbox (and back) with a FLIP transform.
 */

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** On-page geometry of an article image, captured when the lightbox opens. */
export interface LightboxOrigin {
  box: Box;
  naturalWidth: number;
  naturalHeight: number;
}

/** Where the lightbox centers its image and the largest size it may draw it at. */
export interface LightboxStage {
  centerX: number;
  centerY: number;
  maxWidth: number;
  maxHeight: number;
}

export interface FlipTransform {
  x: number;
  y: number;
  scale: number;
}

/** Content box of an image painted with `object-fit: contain` inside `box`. */
export function containBox(box: Box, naturalWidth: number, naturalHeight: number): Box {
  if (naturalWidth <= 0 || naturalHeight <= 0 || box.width <= 0 || box.height <= 0) return box;
  const scale = Math.min(box.width / naturalWidth, box.height / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return { left: box.left + (box.width - width) / 2, top: box.top + (box.height - height) / 2, width, height };
}

/**
 * Transform that lays the lightbox image (centered on the stage, never upscaled) exactly over
 * `origin`; animating from it to identity makes the image grow out of the page.
 */
export function flipFromOrigin(
  origin: Box,
  naturalWidth: number,
  naturalHeight: number,
  stage: LightboxStage,
): FlipTransform | null {
  if (naturalWidth <= 0 || naturalHeight <= 0 || origin.width <= 0) return null;
  const fit = Math.min(1, stage.maxWidth / naturalWidth, stage.maxHeight / naturalHeight);
  return {
    x: origin.left + origin.width / 2 - stage.centerX,
    y: origin.top + origin.height / 2 - stage.centerY,
    scale: origin.width / (naturalWidth * fit),
  };
}

export function intersectsViewport(box: Box, viewportWidth: number, viewportHeight: number): boolean {
  return box.left + box.width > 0 && box.top + box.height > 0 && box.left < viewportWidth && box.top < viewportHeight;
}
