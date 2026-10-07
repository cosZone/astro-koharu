import { useEscapeKey } from '@hooks/useKeyboardShortcut';
import { useStore } from '@nanostores/react';
import { $activeModal, closeModal } from '@store/modal';
import { lazy, Suspense, useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useTranslation } from '@/hooks/useTranslation';

const viewers = {
  codeFullscreen: lazy(() => import('./CodeBlockFullscreen')),
  diagramFullscreen: lazy(() => import('./DiagramFullscreen')),
  imageLightbox: lazy(() => import('./ImageLightbox')),
};
const viewerTypes = ['codeFullscreen', 'diagramFullscreen', 'imageLightbox'] as const;

/** Keep opened viewers mounted for their exit animations; fetch each body only on first use. */
export default function ArticleViewers() {
  const { type } = useStore($activeModal);
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState({ codeFullscreen: false, diagramFullscreen: false, imageLightbox: false });

  useEffect(() => {
    if (type === 'codeFullscreen' || type === 'diagramFullscreen' || type === 'imageLightbox') {
      setLoaded((previous) => (previous[type] ? previous : { ...previous, [type]: true }));
    }
  }, [type]);

  useEscapeKey(closeModal, type === 'codeFullscreen' || type === 'diagramFullscreen' || type === 'imageLightbox');

  function notice(message: string, onClose: () => void) {
    return (
      <div className="fixed inset-x-4 bottom-4 z-60 flex items-center justify-between gap-4 rounded-xl bg-card p-4 shadow-lg">
        <output>{message}</output>
        <button type="button" className="min-h-11 rounded-lg px-4 hover:bg-muted" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    );
  }

  return (
    <>
      {viewerTypes.map((name) => {
        const Viewer = viewers[name];
        return (
          loaded[name] && (
            <ErrorBoundary
              key={name}
              fallbackRender={() =>
                type === name &&
                notice(t('viewer.loadError'), () => {
                  setLoaded((previous) => ({ ...previous, [name]: false }));
                  if ($activeModal.get().type === name) closeModal();
                })
              }
            >
              <Suspense fallback={type === name ? notice(t('common.loading'), closeModal) : null}>
                <Viewer />
              </Suspense>
            </ErrorBoundary>
          )
        );
      })}
    </>
  );
}
