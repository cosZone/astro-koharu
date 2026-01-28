/**
 * CategoryMappingDialog Component
 *
 * A dialog for reviewing and editing new category mappings before saving.
 * Shows auto-generated slugs from Chinese category names using pinyin.
 * Uses react-hook-form with Zod validation.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { categoryMappingSchema } from '@lib/cms';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CategoryMappingDialogProps {
  isOpen: boolean;
  mappings: Record<string, string>;
  onConfirm: (mappings: Record<string, string>) => void;
  onCancel: () => void;
}

/**
 * Sanitizes a slug value to be URL-friendly.
 * Only allows lowercase letters, numbers, and hyphens.
 */
function sanitizeSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export function CategoryMappingDialog({ isOpen, mappings, onConfirm, onCancel }: CategoryMappingDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<Record<string, string>>({
    resolver: zodResolver(categoryMappingSchema),
    defaultValues: mappings,
    mode: 'onChange',
  });

  // Reset form when dialog opens with new mappings
  useEffect(() => {
    reset(mappings);
  }, [mappings, reset]);

  const onSubmit = (data: Record<string, string>) => {
    // Sanitize all slugs before confirming
    const sanitized = Object.fromEntries(Object.entries(data).map(([name, slug]) => [name, sanitizeSlug(slug)]));
    onConfirm(sanitized);
  };

  const categoryNames = Object.keys(mappings);

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>New Category Detected</AlertDialogTitle>
          <AlertDialogDescription>
            The following categories need URL mappings. You can edit the slugs below:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form id="category-mapping-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-3 py-4">
            {categoryNames.map((name) => {
              const error = errors[name];
              return (
                <div key={name} className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="min-w-[80px] font-medium text-sm">{name}</span>
                    <span className="text-muted-foreground">→</span>
                    <input
                      type="text"
                      {...register(name, {
                        setValueAs: sanitizeSlug,
                      })}
                      className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="url-slug"
                    />
                  </div>
                  {error && <p className="ml-[80px] pl-7 text-destructive text-xs">{error.message}</p>}
                </div>
              );
            })}
          </div>
        </form>

        <p className="text-muted-foreground text-xs">These mappings will be added to config/site.yaml</p>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" form="category-mapping-form" disabled={!isValid}>
            Save with Mappings
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
