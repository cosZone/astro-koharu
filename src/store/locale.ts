import { atom } from 'nanostores';
import { defaultLocale } from '@/i18n/config';
import { getLocaleFromUrl } from '@/i18n/utils';

/**
 * Reactive locale state derived from the current URL.
 *
 * - SSR: defaults to `defaultLocale`
 * - Client: reads locale from `window.location.pathname`
 * - View Transitions: auto-updates on `astro:page-load`
 */
export const $locale = atom<string>(typeof window !== 'undefined' ? getLocaleFromUrl(window.location.pathname) : defaultLocale);

// Keep locale in sync with Astro client-side navigation.
if (typeof document !== 'undefined') {
  const handler = () => $locale.set(getLocaleFromUrl(window.location.pathname));
  document.addEventListener('astro:page-load', handler);

  // Clean up old listener on Vite HMR so we don't stack duplicates.
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      document.removeEventListener('astro:page-load', handler);
    });
  }
}
