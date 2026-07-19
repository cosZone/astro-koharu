/**
 * Numeric stepper used by the Settings Center.
 *
 * react-hook-form and Zod accept any finite positive number without an upper clamp.
 * Selected controls may also use an empty value for an automatic setting.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@hooks/useTranslation';
import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { useEffect, useEffectEvent, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z.object({
  value: z.number().positive().finite().nullable(),
});
type FormValues = z.infer<typeof schema>;

/** Input debounce interval in milliseconds. */
const APPLY_DEBOUNCE = 150;

interface NumberFieldProps {
  label: string;
  value: number | null;
  step: number;
  unit?: string;
  emptyValue?: {
    label: string;
    fallback: number;
  };
  onApply: (value: number | null) => void;
}

/** Remove floating-point noise from fractional steps. */
function round(value: number): number {
  return Number(value.toFixed(4));
}

export function NumberField({ label, value, step, unit, emptyValue, onApply }: NumberFieldProps) {
  const { t } = useTranslation();
  const allowsEmpty = emptyValue !== undefined;
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
  const applyWatchedValue = useEffectEvent((next: number | null) => {
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
      if (next === null) {
        if (allowsEmpty) applyWatchedValue(null);
        return;
      }
      if (typeof next !== 'number' || !Number.isFinite(next) || next <= 0) return;
      applyWatchedValue(next);
    });
    return () => {
      subscription.unsubscribe();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [watch, allowsEmpty]);

  const stepBy = (direction: 1 | -1) => {
    const base = value ?? emptyValue?.fallback;
    if (base === undefined) return;
    const next = round(base + direction * step);
    if (next <= 0) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    onApply(next);
  };

  const inputValue = watch('value');
  const invalid = Boolean(errors.value) || (inputValue === null && !allowsEmpty);

  return (
    <div className="flex items-center gap-1" title={invalid ? t('settings.invalidNumber') : undefined}>
      <button
        type="button"
        className="size-7 flex-center rounded-md text-muted-foreground transition-[background-color,color,transform] hover:bg-accent hover:text-foreground active:scale-[0.96]"
        onClick={() => stepBy(-1)}
        aria-label={`${label} -${step}`}
      >
        <Icon icon="ri:subtract-line" className="h-4 w-4" />
      </button>
      <div className="relative">
        <input
          type="number"
          step={step}
          placeholder={emptyValue?.label}
          aria-label={label}
          aria-invalid={invalid || undefined}
          className={cn(
            'w-20 rounded-md border border-input bg-background px-2 py-1 text-center text-sm tabular-nums outline-hidden transition-colors',
            'focus-visible:ring-2 focus-visible:ring-ring',
            invalid && 'border-destructive text-destructive focus-visible:ring-destructive',
          )}
          {...register('value', {
            setValueAs: (rawValue) => (rawValue === '' ? null : Number(rawValue)),
          })}
        />
        {unit && inputValue !== null && (
          <span className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground text-xs">
            {unit}
          </span>
        )}
      </div>
      <button
        type="button"
        className="size-7 flex-center rounded-md text-muted-foreground transition-[background-color,color,transform] hover:bg-accent hover:text-foreground active:scale-[0.96]"
        onClick={() => stepBy(1)}
        aria-label={`${label} +${step}`}
      >
        <Icon icon="ri:add-line" className="h-4 w-4" />
      </button>
    </div>
  );
}
