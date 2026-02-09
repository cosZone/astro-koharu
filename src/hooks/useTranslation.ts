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
 * @example
 * ```tsx
 * const { t, locale } = useTranslation();
 * return <button>{t('common.copy')}</button>;
 * ```
 */
export function useTranslation() {
  const locale = useStore($locale);

  const translate = useCallback(
    (key: TranslationKey, params?: TranslationParams): string => {
      return t(locale, key, params);
    },
    [locale],
  );

  return { t: translate, locale };
}
