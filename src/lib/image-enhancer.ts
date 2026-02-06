/**
 * Image loading enhancement
 * Adds loaded/error states, fullscreen button, and portrait image grouping.
 *
 * Lightbox functionality has been migrated to React (ImageLightbox.tsx).
 * This module dispatches 'open-image-lightbox' custom events instead.
 */

// WeakSet to track enhanced images and avoid re-processing
const enhancedImages = new WeakSet<HTMLImageElement>();

/**
 * Create fullscreen button for images
 */
function createFullscreenButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'markdown-image-fullscreen';
  button.setAttribute('type', 'button');
  button.setAttribute('aria-label', '全屏查看');
  button.title = '全屏查看';
  button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
  return button;
}

/**
 * Create accessible error placeholder for failed images
 */
function createErrorPlaceholder(img: HTMLImageElement): HTMLElement {
  const placeholder = document.createElement('div');
  placeholder.className = 'markdown-image-error';
  placeholder.setAttribute('role', 'img');
  placeholder.setAttribute('aria-label', img.alt ? `图片加载失败: ${img.alt}` : '图片加载失败');

  const icon = document.createElement('span');
  icon.className = 'markdown-image-error-icon';
  icon.setAttribute('aria-hidden', 'true');

  const text = document.createElement('span');
  text.className = 'markdown-image-error-text';
  text.textContent = '图片加载失败';

  placeholder.appendChild(icon);
  placeholder.appendChild(text);

  return placeholder;
}

/**
 * Open image in React lightbox via custom event
 */
function openImageLightbox(src: string, alt: string, images: { src: string; alt: string }[], currentIndex: number): void {
  window.dispatchEvent(
    new CustomEvent('open-image-lightbox', {
      detail: { src, alt, images, currentIndex },
    }),
  );
}

/**
 * Handle image click for lightbox (using event delegation).
 * Collects all loaded images from the content container to enable navigation.
 */
function handleImageClick(e: Event): void {
  const target = e.target as HTMLElement;
  let img: HTMLImageElement | null = null;

  if (target.classList.contains('markdown-image')) {
    img = target as HTMLImageElement;
  } else if (target.closest('.markdown-image-fullscreen')) {
    const wrapper = target.closest('.markdown-image-wrapper');
    img = wrapper?.querySelector('.markdown-image') as HTMLImageElement | null;
    if (img) e.stopPropagation();
  }

  if (!img) return;

  // Collect all loaded images from the nearest content container
  const container = img.closest('.custom-content') ?? document.body;
  const allImages = Array.from(container.querySelectorAll<HTMLImageElement>('.markdown-image.loaded'));
  const images = allImages.map((i) => ({ src: i.src, alt: i.alt || '图片' }));
  const currentIndex = Math.max(0, allImages.indexOf(img));

  openImageLightbox(img.src, img.alt || '图片', images, currentIndex);
}

export function enhanceImages(container: Element): void {
  const images = container.querySelectorAll<HTMLImageElement>('.markdown-image');
  let loadedCount = 0;
  const totalImages = images.length;

  // Event delegation for clicks
  container.addEventListener('click', handleImageClick);

  const checkAllLoaded = () => {
    loadedCount++;
    if (loadedCount >= totalImages) {
      groupPortraitImages(container);
    }
  };

  images.forEach((img) => {
    if (enhancedImages.has(img)) {
      checkAllLoaded();
      return;
    }
    enhancedImages.add(img);

    if (img.complete && img.naturalWidth > 0) {
      handleImageLoaded(img);
      checkAllLoaded();
      return;
    }

    if (img.complete && img.naturalWidth === 0) {
      handleImageError(img);
      checkAllLoaded();
      return;
    }

    img.addEventListener(
      'load',
      () => {
        handleImageLoaded(img);
        checkAllLoaded();
      },
      { once: true },
    );

    img.addEventListener(
      'error',
      () => {
        handleImageError(img);
        checkAllLoaded();
      },
      { once: true },
    );
  });

  if (totalImages === 0) {
    groupPortraitImages(container);
  }
}

function handleImageLoaded(img: HTMLImageElement): void {
  img.classList.add('loaded');

  const isPortrait = img.naturalHeight > img.naturalWidth * 1.2;
  if (isPortrait) {
    img.closest('.markdown-image-wrapper')?.classList.add('portrait');
  }

  const wrapper = img.closest('.markdown-image-wrapper');
  if (!wrapper || wrapper.querySelector('.markdown-image-fullscreen')) return;

  const fullscreenBtn = createFullscreenButton();
  wrapper.appendChild(fullscreenBtn);

  img.style.cursor = 'zoom-in';
}

function handleImageError(img: HTMLImageElement): void {
  img.classList.add('error');

  const wrapper = img.closest('.markdown-image-wrapper');
  if (wrapper && !wrapper.querySelector('.markdown-image-error')) {
    const placeholder = createErrorPlaceholder(img);
    wrapper.appendChild(placeholder);
  }
}

/**
 * Group consecutive portrait images side by side
 */
function groupPortraitImages(container: Element): void {
  const allWrappers = Array.from(container.querySelectorAll('.markdown-image-wrapper'));

  let currentGroup: Element[] = [];

  const flushGroup = () => {
    if (currentGroup.length >= 2) {
      const row = document.createElement('div');
      row.className = 'markdown-image-row';

      currentGroup[0].parentNode?.insertBefore(row, currentGroup[0]);

      const fragment = document.createDocumentFragment();
      currentGroup.forEach((wrapper) => {
        fragment.appendChild(wrapper);
      });
      row.appendChild(fragment);
    }
    currentGroup = [];
  };

  allWrappers.forEach((wrapper, index) => {
    const isPortrait = wrapper.classList.contains('portrait');
    if (wrapper.parentElement?.classList.contains('markdown-image-row')) return;

    if (isPortrait) {
      const prevWrapper = allWrappers[index - 1];

      if (
        currentGroup.length > 0 &&
        prevWrapper &&
        prevWrapper.classList.contains('portrait') &&
        isConsecutiveSibling(prevWrapper, wrapper)
      ) {
        currentGroup.push(wrapper);
      } else {
        flushGroup();
        currentGroup = [wrapper];
      }
    } else {
      flushGroup();
    }
  });

  flushGroup();
}

/**
 * Check if two elements are consecutive siblings (allowing text nodes between)
 */
function isConsecutiveSibling(el1: Element, el2: Element): boolean {
  let next = el1.nextSibling;
  while (next) {
    if (next.nodeType === Node.TEXT_NODE && next.textContent?.trim() === '') {
      next = next.nextSibling;
      continue;
    }
    return next === el2;
  }
  return false;
}
