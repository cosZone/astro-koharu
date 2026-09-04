import { useStore } from '@nanostores/react';
import { useCallback } from 'react';
import type { TranslationKey, TranslationParams } from '@/i18n/types';
import { t } from '@/i18n/utils';
import { $locale } from '@/store/locale';

/**
 * React hook for accessing translations in client components.
 *
 * Reads the current locale from the `$locale` nanostore and returns
 * a stable `t()` function (via useCallback) plus the current locale string.
 *
 * Islands that are server-rendered (client:load/idle/visible) on localized
 * pages should pass the page's `locale` as `localeOverride`: the `$locale`
 * store falls back to `defaultLocale` during SSR, so without the override the
 * server HTML would use the default locale while the client hydrates with the
 * URL locale, causing a React hydration mismatch (#418).
 *
 * @example
 * ```tsx
 * const { t, locale } = useTranslation();
 * return <button>{t('common.copy')}</button>;
 * ```
 */
export function useTranslation(localeOverride?: string) {
  const storeLocale = useStore($locale);
  const locale = localeOverride ?? storeLocale;

  const translate = useCallback(
    (key: TranslationKey, params?: TranslationParams): string => {
      return t(locale, key, params);
    },
    [locale],
  );

  return { t: translate, locale };
}
