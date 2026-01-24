/**
 * CategoryMappingDialog Component
 *
 * A dialog for reviewing and editing new category mappings before saving.
 * Shows auto-generated slugs from Chinese category names using pinyin.
 */

import { useCallback, useEffect, useState } from 'react';
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
  const [editedMappings, setEditedMappings] = useState<Record<string, string>>(mappings);

  // Reset edited mappings when dialog opens with new mappings
  useEffect(() => {
    setEditedMappings(mappings);
  }, [mappings]);

  const handleSlugChange = useCallback((name: string, value: string) => {
    setEditedMappings((prev) => ({
      ...prev,
      [name]: sanitizeSlug(value),
    }));
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(editedMappings);
  }, [editedMappings, onConfirm]);

  // Check if all slugs are valid (non-empty)
  const allSlugsValid = Object.values(editedMappings).every((slug) => slug.length > 0);

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>New Category Detected</AlertDialogTitle>
          <AlertDialogDescription>
            The following categories need URL mappings. You can edit the slugs below:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-4">
          {Object.entries(editedMappings).map(([name, slug]) => (
            <div key={name} className="flex items-center gap-3">
              <span className="min-w-[80px] font-medium text-sm">{name}</span>
              <span className="text-muted-foreground">→</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(name, e.target.value)}
                className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="url-slug"
              />
            </div>
          ))}
        </div>

        <p className="text-muted-foreground text-xs">These mappings will be added to config/site.yaml</p>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={!allSlugsValid}>
            Save with Mappings
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
