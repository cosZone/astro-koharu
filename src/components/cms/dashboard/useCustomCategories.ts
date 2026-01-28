/**
 * useCustomCategories Hook
 *
 * Manages custom category state for the CreatePostDialog.
 * Handles adding, removing, and tracking custom categories with auto-generated slugs.
 */

import { generateSlug } from '@lib/cms';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export interface CustomCategory {
  name: string;
  slug: string;
}

interface UseCustomCategoriesOptions {
  existingCategories: string[];
  onCategoryAdded?: (category: CustomCategory) => void;
}

export function useCustomCategories({ existingCategories, onCategoryAdded }: UseCustomCategoriesOptions) {
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customSlugValue, setCustomSlugValue] = useState('');

  const resetInput = useCallback(() => {
    setCustomName('');
    setCustomSlugValue('');
    setShowCustomInput(false);
  }, []);

  const resetAll = useCallback(() => {
    setCustomCategories([]);
    resetInput();
  }, [resetInput]);

  const handleCustomNameChange = useCallback((name: string) => {
    setCustomName(name);
    setCustomSlugValue(generateSlug(name));
  }, []);

  const handleSlugChange = useCallback((slug: string) => {
    setCustomSlugValue(slug.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  }, []);

  const addCustomCategory = useCallback(() => {
    const trimmedName = customName.trim();
    const trimmedSlug = customSlugValue.trim();

    if (!trimmedName || !trimmedSlug) {
      toast.error('Category name and slug are required');
      return null;
    }

    // Check if category already exists
    if (existingCategories.includes(trimmedName) || customCategories.some((c) => c.name === trimmedName)) {
      toast.error('Category already exists');
      return null;
    }

    const newCategory: CustomCategory = { name: trimmedName, slug: trimmedSlug };

    setCustomCategories((prev) => [...prev, newCategory]);
    resetInput();
    onCategoryAdded?.(newCategory);

    return newCategory;
  }, [customName, customSlugValue, existingCategories, customCategories, resetInput, onCategoryAdded]);

  const removeCustomCategory = useCallback((name: string) => {
    setCustomCategories((prev) => prev.filter((c) => c.name !== name));
  }, []);

  const openCustomInput = useCallback(() => {
    setShowCustomInput(true);
  }, []);

  const closeCustomInput = useCallback(() => {
    resetInput();
  }, [resetInput]);

  /**
   * Build category mappings object for API submission
   */
  const getCategoryMappings = useCallback(() => {
    const mappings: Record<string, string> = {};
    for (const cat of customCategories) {
      mappings[cat.name] = cat.slug;
    }
    return Object.keys(mappings).length > 0 ? mappings : undefined;
  }, [customCategories]);

  return {
    customCategories,
    showCustomInput,
    customName,
    customSlugValue,
    handleCustomNameChange,
    handleSlugChange,
    addCustomCategory,
    removeCustomCategory,
    openCustomInput,
    closeCustomInput,
    resetAll,
    getCategoryMappings,
  };
}
