/**
 * Type definitions for i18n content translations (config/i18n-content.yaml)
 */

export interface SeriesContentTranslation {
  label?: string;
  fullName?: string;
  description?: string;
}

export interface FeaturedCategoryContentTranslation {
  label?: string;
  description?: string;
}

export interface LocaleContentTranslations {
  categories?: Record<string, string>;
  series?: Record<string, SeriesContentTranslation>;
  featuredCategories?: Record<string, FeaturedCategoryContentTranslation>;
}

export type I18nContentConfig = Record<string, LocaleContentTranslations>;
