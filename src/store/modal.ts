/**
 * Unified Modal State Management
 *
 * Consolidates all modal/drawer/dialog state into a single store.
 * This replaces the scattered state in ui.ts for better state coordination.
 *
 * Features:
 * - Single active modal at a time (prevents stacking conflicts)
 * - Automatic body scroll lock
 * - Computed helpers for backward compatibility
 * - Type-safe modal data
 */

import { atom, computed } from 'nanostores';
import type { CodeBlockData, MermaidFullscreenData } from './ui';

export type ModalType = 'drawer' | 'search' | 'codeFullscreen' | 'mermaidFullscreen' | null;

export interface ModalState {
  type: ModalType;
  data?: CodeBlockData | MermaidFullscreenData | null;
}

/**
 * Single source of truth for modal state
 */
export const $activeModal = atom<ModalState>({ type: null });

// Computed helpers for backward compatibility and convenience
export const $isDrawerOpen = computed($activeModal, (m) => m.type === 'drawer');
export const $isSearchOpen = computed($activeModal, (m) => m.type === 'search');
export const $codeFullscreenData = computed($activeModal, (m) =>
  m.type === 'codeFullscreen' ? (m.data as CodeBlockData) : null,
);
export const $mermaidFullscreenData = computed($activeModal, (m) =>
  m.type === 'mermaidFullscreen' ? (m.data as MermaidFullscreenData) : null,
);
export const $isAnyModalOpen = computed($activeModal, (m) => m.type !== null);

/**
 * Open a modal with optional data
 */
export function openModal<T extends ModalType>(
  type: T,
  data?: T extends 'codeFullscreen' ? CodeBlockData : T extends 'mermaidFullscreen' ? MermaidFullscreenData : never,
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

// Convenience functions for specific modals (backward compatible API)
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
