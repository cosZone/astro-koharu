/**
 * Category Mapping Dialog
 *
 * Dialog for mapping new categories to URL slugs.
 * Shows when the editor detects categories not in config/site.yaml.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { Icon } from '@iconify/react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { generateCategorySlug } from '@/lib/category';
import { categorySlugSchema } from '@/lib/schemas';
import { cn } from '@/lib/utils';

interface CategoryMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** New categories that need slug mappings */
  newCategories: Record<string, string>;
  /** Called when user confirms mappings */
  onConfirm: (mappings: Record<string, string>) => void;
  /** Called when user cancels */
  onCancel: () => void;
}

/**
 * Creates a dynamic Zod schema based on category names
 */
function createMappingSchema(categoryNames: string[]) {
  const shape: Record<string, z.ZodString> = {};
  for (const name of categoryNames) {
    shape[name] = categorySlugSchema;
  }
  return z.object(shape);
}

export function CategoryMappingDialog({ open, onOpenChange, newCategories, onConfirm, onCancel }: CategoryMappingDialogProps) {
  const categoryNames = Object.keys(newCategories);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form with dynamic schema
  const schema = createMappingSchema(categoryNames);
  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: newCategories,
  });

  // Reset form when dialog opens with new categories
  useEffect(() => {
    if (open) {
      reset(newCategories);
    }
  }, [open, newCategories, reset]);

  const handleClose = () => {
    onCancel();
    onOpenChange(false);
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      onConfirm(data);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerate = (name: string) => {
    const newSlug = generateCategorySlug(name);
    setValue(name, newSlug);
  };

  if (categoryNames.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="ri:folder-add-line" className="size-5 text-primary" />
            New Categories Detected
          </DialogTitle>
          <DialogDescription>
            The following categories are not in your site configuration. Please provide URL-friendly slugs for them.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="max-h-64 space-y-3 overflow-y-auto">
            {categoryNames.map((name) => (
              <div key={name} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor={`slug-${name}`} className="font-medium text-sm">
                    {name}
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRegenerate(name)}
                    className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
                    title="Regenerate slug"
                  >
                    <Icon icon="ri:refresh-line" className="size-3.5" />
                    Regenerate
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">/category/</span>
                  <input
                    id={`slug-${name}`}
                    type="text"
                    {...register(name)}
                    placeholder="category-slug"
                    className={cn(
                      'flex-1 rounded border border-input bg-background px-2 py-1.5 text-sm',
                      'focus:outline-none focus:ring-1 focus:ring-ring',
                      errors[name] && 'border-destructive',
                    )}
                  />
                </div>
                {errors[name] && <p className="text-destructive text-xs">{errors[name]?.message as string}</p>}
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-muted-foreground text-xs">
              <Icon icon="ri:information-line" className="mr-1 inline size-3.5" />
              Slugs should be lowercase and contain only letters, numbers, and hyphens (e.g., "front-end").
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Icon icon="ri:loader-4-line" className="mr-1.5 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Icon icon="ri:check-line" className="mr-1.5 size-4" />
                  Confirm Mappings
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
