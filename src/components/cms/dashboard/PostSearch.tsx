/**
 * PostSearch Component
 *
 * Search input with debounce for filtering posts by title.
 */

import { SEARCH_DEBOUNCE_MS } from '@constants/cms';
import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { debounce } from 'es-toolkit';
import { useEffect, useMemo, useState } from 'react';

interface PostSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function PostSearch({ value, onChange, className }: PostSearchProps) {
  const [localValue, setLocalValue] = useState(value);

  // Create debounced onChange callback
  const debouncedOnChange = useMemo(() => debounce(onChange, SEARCH_DEBOUNCE_MS), [onChange]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => debouncedOnChange.cancel();
  }, [debouncedOnChange]);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  };

  const handleClear = () => {
    setLocalValue('');
    debouncedOnChange.cancel();
    onChange('');
  };

  return (
    <div className={cn('relative', className)}>
      <Icon icon="ri:search-line" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search posts..."
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        className={cn(
          'h-9 w-full rounded-md border border-input bg-background pr-3 pl-9 text-sm',
          'placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        )}
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
        >
          <Icon icon="ri:close-line" className="size-4" />
        </button>
      )}
    </div>
  );
}
