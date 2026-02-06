/**
 * Unified Modal State Management
 *
 * Consolidates all modal/drawer/dialog state into a single store.
 * This replaces the scattered state in ui.ts for better state coordination.
 *
 * Features:
 * - Single active modal at a time (prevents stacking conflicts)
 * - Automatic body scroll lock
 * - Computed helpers for convenience
 * - Type-safe modal data
 */

import { atom, computed } from 'nanostores';

/**
 * Code fullscreen data
 */
export interface CodeBlockData {
  code: string;
  codeHTML: string;
  language: string;
  preClassName: string;
  preStyle: string;
  codeClassName: string;
}

/**
 * Unified diagram fullscreen data (mermaid + infographic)
 */
export interface DiagramFullscreenData {
  diagramType: 'mermaid' | 'infographic';
  svg: string;
  source: string;
}

/**
 * Image lightbox data
 */
export interface ImageLightboxData {
  src: string;
  alt: string;
  images: { src: string; alt: string }[];
  currentIndex: number;
}

export type ModalType = 'drawer' | 'search' | 'codeFullscreen' | 'diagramFullscreen' | 'imageLightbox' | null;

export interface ModalState {
  type: ModalType;
  data?: CodeBlockData | DiagramFullscreenData | ImageLightboxData | null;
}

/**
 * Single source of truth for modal state
 */
export const $activeModal = atom<ModalState>({ type: null });

// Computed helpers for convenience
export const $isDrawerOpen = computed($activeModal, (m) => m.type === 'drawer');
export const $isSearchOpen = computed($activeModal, (m) => m.type === 'search');
export const $codeFullscreenData = computed($activeModal, (m) =>
  m.type === 'codeFullscreen' ? (m.data as CodeBlockData) : null,
);
export const $diagramFullscreenData = computed($activeModal, (m) =>
  m.type === 'diagramFullscreen' ? (m.data as DiagramFullscreenData) : null,
);
export const $imageLightboxData = computed($activeModal, (m) =>
  m.type === 'imageLightbox' ? (m.data as ImageLightboxData) : null,
);
export const $isAnyModalOpen = computed($activeModal, (m) => m.type !== null);

/**
 * Open a modal with optional data
 */
export function openModal<T extends ModalType>(
  type: T,
  data?: T extends 'codeFullscreen'
    ? CodeBlockData
    : T extends 'diagramFullscreen'
      ? DiagramFullscreenData
      : T extends 'imageLightbox'
        ? ImageLightboxData
        : never,
): void {
  $activeModal.set({ type, data });
  if (type && typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Close the currently active modal
 */
export function closeModal(): void {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
  $activeModal.set({ type: null });
}

/**
 * Toggle a modal (open if closed, close if open)
 */
export function toggleModal(type: ModalType): void {
  if ($activeModal.get().type === type) {
    closeModal();
  } else {
    openModal(type);
  }
}

// Convenience functions for specific modals
export const openDrawer = () => openModal('drawer');
export const closeDrawer = () => closeModal();
export const toggleDrawer = () => toggleModal('drawer');

export const openSearch = () => openModal('search');
export const closeSearch = () => closeModal();
export const toggleSearch = () => toggleModal('search');

export const openCodeFullscreen = (data: CodeBlockData) => openModal('codeFullscreen', data);
export const closeCodeFullscreen = () => closeModal();

/**
 * Navigate between images in the lightbox without re-triggering scroll lock.
 * Directly mutates the atom to avoid openModal/closeModal side effects.
 */
export function navigateImage(direction: 1 | -1): boolean {
  const modal = $activeModal.get();
  if (modal.type !== 'imageLightbox') return false;
  const data = modal.data as ImageLightboxData;
  const newIndex = data.currentIndex + direction;
  if (newIndex < 0 || newIndex >= data.images.length) return false;
  const target = data.images[newIndex];
  $activeModal.set({
    type: 'imageLightbox',
    data: { ...data, src: target.src, alt: target.alt, currentIndex: newIndex },
  });
  return true;
}
