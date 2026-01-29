/**
 * CreatePostDialog Component
 *
 * Dialog for creating a new blog post with title, categories, and tags.
 * Uses react-hook-form with Zod validation.
 * Supports adding custom categories with auto-generated slugs.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { Icon } from '@iconify/react';
import { type CreatePostFormData, createPost, createPostSchema } from '@lib/cms';
import { cn } from '@lib/utils';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCustomCategories } from './useCustomCategories';

interface CreatePostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  onCreated: (postId: string) => void;
}

export function CreatePostDialog({ isOpen, onClose, categories, onCreated }: CreatePostDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreatePostFormData>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      title: '',
      categories: [],
      tags: '',
      draft: true,
    },
  });

  const selectedCategories = watch('categories') || [];

  const {
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
  } = useCustomCategories({
    existingCategories: categories,
    onCategoryAdded: (cat) => {
      setValue('categories', [...selectedCategories, cat.name]);
    },
  });

  const handleClose = useCallback(() => {
    reset();
    resetAll();
    onClose();
  }, [onClose, reset, resetAll]);

  const handleRemoveCustomCategory = useCallback(
    (name: string) => {
      removeCustomCategory(name);
      setValue(
        'categories',
        selectedCategories.filter((c) => c !== name),
      );
    },
    [selectedCategories, setValue, removeCustomCategory],
  );

  const onSubmit = async (data: CreatePostFormData) => {
    try {
      const tags = data.tags
        ?.split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const result = await createPost({
        title: data.title.trim(),
        categories: data.categories && data.categories.length > 0 ? data.categories : undefined,
        tags: tags && tags.length > 0 ? tags : undefined,
        draft: data.draft,
        categoryMappings: getCategoryMappings(),
      });

      toast.success('Post created successfully');
      handleClose();
      onCreated(result.postId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create post');
    }
  };

  const toggleCategory = (category: string) => {
    const current = selectedCategories;
    if (current.includes(category)) {
      setValue(
        'categories',
        current.filter((c) => c !== category),
      );
    } else {
      setValue('categories', [...current, category]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="ri:add-line" className="size-5" />
            New Post
          </DialogTitle>
          <DialogDescription>Create a new blog post. It will be saved as a draft.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="post-title" className="font-medium text-sm">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                id="post-title"
                type="text"
                {...register('title')}
                placeholder="Enter post title..."
                className={cn(
                  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm',
                  'placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  errors.title && 'border-destructive',
                )}
                autoFocus
              />
              {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <span className="font-medium text-sm">Categories</span>
              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                {/* Existing categories */}
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-sm transition-colors',
                      selectedCategories.includes(cat)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-accent',
                    )}
                  >
                    {cat}
                  </button>
                ))}

                {/* Custom categories */}
                {customCategories.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => toggleCategory(cat.name)}
                    className={cn(
                      'group relative rounded-md border px-2.5 py-1 text-sm transition-colors',
                      selectedCategories.includes(cat.name)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-accent',
                    )}
                  >
                    <span className="flex items-center gap-1">
                      {cat.name}
                      <span className="text-muted-foreground text-xs">({cat.slug})</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCustomCategory(cat.name);
                        }}
                        className="ml-0.5 rounded hover:bg-destructive/20 hover:text-destructive"
                      >
                        <Icon icon="ri:close-line" className="size-3.5" />
                      </button>
                    </span>
                  </button>
                ))}

                {/* Add custom button */}
                {!showCustomInput && (
                  <button
                    type="button"
                    onClick={openCustomInput}
                    className="rounded-md border border-border border-dashed px-2.5 py-1 text-muted-foreground text-sm transition-colors hover:border-primary hover:text-primary"
                  >
                    <Icon icon="ri:add-line" className="mr-0.5 inline size-4" />
                    Custom
                  </button>
                )}
              </div>

              {/* Custom category input */}
              {showCustomInput && (
                <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => handleCustomNameChange(e.target.value)}
                      placeholder="Category name..."
                      className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={customSlugValue}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="slug"
                      className="h-8 w-28 rounded-md border border-input bg-background px-2 font-mono text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={closeCustomInput}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" onClick={addCustomCategory} disabled={!customName.trim()}>
                      Add
                    </Button>
                  </div>
                </div>
              )}

              {selectedCategories.length > 0 && (
                <p className="text-muted-foreground text-xs">Path: {selectedCategories.join(' > ')}</p>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label htmlFor="post-tags" className="font-medium text-sm">
                Tags
              </label>
              <input
                id="post-tags"
                type="text"
                {...register('tags')}
                placeholder="Enter tags separated by commas..."
                className={cn(
                  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm',
                  'placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                )}
              />
              <p className="text-muted-foreground text-xs">Example: React, JavaScript, Tutorial</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Icon icon="ri:loader-4-line" className="mr-1.5 size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Icon icon="ri:add-line" className="mr-1.5 size-4" />
                  Create
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
