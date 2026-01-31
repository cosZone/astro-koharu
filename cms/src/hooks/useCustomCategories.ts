/**
 * Custom Categories Hook
 *
 * Manages custom category state for the CreatePostDialog.
 * Handles category slug mapping for new categories.
 */

import { useCallback, useState } from 'react';
import { generateCategorySlug } from '@/lib/category';

export interface CustomCategory {
  name: string;
  slug: string;
}

/**
 * Hook for managing custom categories in the CreatePostDialog
 *
 * @returns State and handlers for custom categories
 */
export function useCustomCategories() {
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);

  /**
   * Add a new custom category
   */
  const addCustomCategory = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setCustomCategories((prev) => {
      // Check if category already exists
      if (prev.some((c) => c.name === trimmedName)) {
        return prev;
      }
      return [...prev, { name: trimmedName, slug: generateCategorySlug(trimmedName) }];
    });
  }, []);

  /**
   * Remove a custom category
   */
  const removeCustomCategory = useCallback((name: string) => {
    setCustomCategories((prev) => prev.filter((c) => c.name !== name));
  }, []);

  /**
   * Update the slug for a custom category
   */
  const updateCategorySlug = useCallback((name: string, slug: string) => {
    setCustomCategories((prev) => prev.map((c) => (c.name === name ? { ...c, slug } : c)));
  }, []);

  /**
   * Reset all custom categories
   */
  const resetCustomCategories = useCallback(() => {
    setCustomCategories([]);
  }, []);

  /**
   * Get category mappings as a record
   */
  const getCategoryMappings = useCallback((): Record<string, string> => {
    return Object.fromEntries(customCategories.map((c) => [c.name, c.slug]));
  }, [customCategories]);

  return {
    customCategories,
    addCustomCategory,
    removeCustomCategory,
    updateCategorySlug,
    resetCustomCategories,
    getCategoryMappings,
  };
}
