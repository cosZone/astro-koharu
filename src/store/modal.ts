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
 * Mermaid fullscreen data
 */
export interface MermaidFullscreenData {
  svg: string;
  source: string;
}

/**
 * Infographic fullscreen data
 */
export interface InfographicFullscreenData {
  svg: string;
  source: string;
}

export type ModalType = 'drawer' | 'search' | 'codeFullscreen' | 'mermaidFullscreen' | 'infographicFullscreen' | null;

export interface ModalState {
  type: ModalType;
  data?: CodeBlockData | MermaidFullscreenData | InfographicFullscreenData | null;
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
export const $mermaidFullscreenData = computed($activeModal, (m) =>
  m.type === 'mermaidFullscreen' ? (m.data as MermaidFullscreenData) : null,
);
export const $infographicFullscreenData = computed($activeModal, (m) =>
  m.type === 'infographicFullscreen' ? (m.data as InfographicFullscreenData) : null,
);
export const $isAnyModalOpen = computed($activeModal, (m) => m.type !== null);

/**
 * Open a modal with optional data
 */
export function openModal<T extends ModalType>(
  type: T,
  data?: T extends 'codeFullscreen'
    ? CodeBlockData
    : T extends 'mermaidFullscreen'
      ? MermaidFullscreenData
      : T extends 'infographicFullscreen'
        ? InfographicFullscreenData
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

export const openMermaidFullscreen = (data: MermaidFullscreenData) => openModal('mermaidFullscreen', data);
export const closeMermaidFullscreen = () => closeModal();

export const openInfographicFullscreen = (data: InfographicFullscreenData) => openModal('infographicFullscreen', data);
export const closeInfographicFullscreen = () => closeModal();
