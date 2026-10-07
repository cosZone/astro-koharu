import { useIsMounted } from '@hooks/useIsMounted';
import { useTranslation } from '@hooks/useTranslation';
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

const providers = {
  waline: lazy(() => import('./Waline')),
  twikoo: lazy(() => import('./Twikoo')),
  giscus: lazy(() => import('./Giscus')),
};

/** The visible island renders a stable placeholder on the server, even for browser-only SDKs. */
export default function DeferredComment({ provider }: { provider: keyof typeof providers }) {
  const mounted = useIsMounted();
  const { t } = useTranslation();
  const Provider = providers[provider];
  const placeholder = <div className="h-80 animate-pulse rounded-xl bg-muted/30" aria-hidden="true" />;

  return (
    <div className="min-h-80">
      <ErrorBoundary
        fallbackRender={() => (
          <div className="flex flex-col items-center gap-3 p-6">
            <p>{t('comment.error')}</p>
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
              onClick={() => window.location.reload()}
            >
              {t('comment.retry')}
            </button>
          </div>
        )}
      >
        {mounted ? (
          <Suspense fallback={placeholder}>
            <Provider />
          </Suspense>
        ) : (
          placeholder
        )}
      </ErrorBoundary>
    </div>
  );
}
