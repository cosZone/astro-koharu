/**
 * Numeric stepper used by the Settings Center.
 *
 * react-hook-form and Zod accept any finite positive number without an upper clamp.
 * Valid input applies after a short debounce; invalid input only shows an error state.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@hooks/useTranslation';
import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { useEffect, useEffectEvent, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z.object({
  value: z.number().positive().finite(),
});
type FormValues = z.infer<typeof schema>;

/** Input debounce interval in milliseconds. */
const APPLY_DEBOUNCE = 150;

interface NumberFieldProps {
  label: string;
  value: number;
  step: number;
  unit?: string;
  onApply: (value: number) => void;
}

/** Remove floating-point noise from fractional steps. */
function round(value: number): number {
  return Number(value.toFixed(4));
}

export function NumberField({ label, value, step, unit, onApply }: NumberFieldProps) {
  const { t } = useTranslation();
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { value },
    mode: 'onChange',
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyWatchedValue = useEffectEvent((next: number) => {
    if (next === value) return;
    debounceRef.current = setTimeout(() => onApply(next), APPLY_DEBOUNCE);
  });

  // Synchronize external changes from the stepper or reset action.
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setValue('value', value, { shouldValidate: true });
  }, [value, setValue]);

  // Apply valid input after the debounce; validation owns the error state.
  useEffect(() => {
    const subscription = watch((data) => {
      const next = data.value;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (typeof next !== 'number' || !Number.isFinite(next) || next <= 0) return;
      applyWatchedValue(next);
    });
    return () => {
      subscription.unsubscribe();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [watch]);

  const stepBy = (direction: 1 | -1) => {
    const next = round(value + direction * step);
    if (next <= 0) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    onApply(next);
  };

  const invalid = Boolean(errors.value);

  return (
    <div className="flex items-center gap-1" title={invalid ? t('settings.invalidNumber') : undefined}>
      <button
        type="button"
        className="size-7 flex-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        onClick={() => stepBy(-1)}
        aria-label={`${label} -${step}`}
      >
        <Icon icon="ri:subtract-line" className="h-4 w-4" />
      </button>
      <div className="relative">
        <input
          type="number"
          step={step}
          aria-label={label}
          aria-invalid={invalid || undefined}
          className={cn(
            'w-20 rounded-md border border-input bg-background px-2 py-1 text-center text-sm outline-hidden transition-colors',
            'focus-visible:ring-2 focus-visible:ring-ring',
            invalid && 'border-destructive text-destructive focus-visible:ring-destructive',
          )}
          {...register('value', { valueAsNumber: true })}
        />
        {unit && (
          <span className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground text-xs">
            {unit}
          </span>
        )}
      </div>
      <button
        type="button"
        className="size-7 flex-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        onClick={() => stepBy(1)}
        aria-label={`${label} +${step}`}
      >
        <Icon icon="ri:add-line" className="h-4 w-4" />
      </button>
    </div>
  );
}
