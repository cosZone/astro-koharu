import { useEscapeKey, useKeyboardShortcut } from '@hooks/useKeyboardShortcut';
import { useTranslation } from '@hooks/useTranslation';
import { useStore } from '@nanostores/react';
import { $isSearchOpen, closeModal, openModal } from '@store/modal';
import { useEffect, useState } from 'react';

const loadSearchDialog = () => import('./SearchDialogContent');

export function preloadSearchDialog(): void {
  void loadSearchDialog().catch(() => {});
}

/** Keep shortcuts ready; retain the dialog after its first open so exit animations can finish. */
export default function SearchDialog() {
  const { t } = useTranslation();
  const open = useStore($isSearchOpen);
  const [Content, setContent] = useState<typeof import('./SearchDialogContent').default | null>(null);

  useKeyboardShortcut({ key: 'k', modifiers: ['meta'], handler: () => openModal('search') });
  useEscapeKey(() => closeModal(), open);

  useEffect(() => {
    if (!open || Content) return;
    let cancelled = false;
    void loadSearchDialog()
      .then((module) => {
        if (!cancelled) setContent(() => module.default);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if ($isSearchOpen.get()) closeModal();
        console.error('[Search] Dialog failed to load:', error);
        void import('sonner').then(({ toast }) => toast.error(t('search.loadError'))).catch(() => {});
      });
    return () => {
      cancelled = true;
    };
  }, [open, Content, t]);

  useEffect(() => {
    const closeForNavigation = () => closeModal();
    document.addEventListener('astro:before-preparation', closeForNavigation);
    return () => document.removeEventListener('astro:before-preparation', closeForNavigation);
  }, []);

  return Content ? <Content /> : null;
}
