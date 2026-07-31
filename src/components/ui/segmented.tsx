import { useControlledState } from '@hooks/useControlledState';
import { cn } from '@lib/utils';
import React from 'react';

export type OptionType<T extends string | number = string | number> = {
  label?: string;
  value: T;
  icon?: React.ComponentType<{ className?: string }>;
} | null;

type SegmentedProps<T extends string | number = string | number> = {
  options: OptionType<T>[]; // 选项
  defaultValue?: T; // 默认值
  onChange?: (value: T) => void;
  className?: string;
  indicateClass?: string;
  itemClass?: string;
  value?: T; // 受控
};

export const Segmented = <T extends string | number = string | number>({
  options,
  defaultValue,
  onChange,
  className,
  indicateClass,
  itemClass,
  value,
}: SegmentedProps<T>) => {
  const [selectedValue, setSelectedValue] = useControlledState<T>({
    value,
    defaultValue: (defaultValue ?? options[0]?.value ?? '') as T,
    onChange,
  });

  return (
    <div
      className={cn(
        'flex w-fit cursor-pointer select-none rounded-sm bg-muted p-1 font-semibold text-xs backdrop-blur-lg',
        className,
      )}
    >
      {options.map((option) => {
        if (!option) return null;
        const { label, value, icon } = option;
        const selected = selectedValue === value;
        return (
          <button
            type="button"
            className={cn(
              'relative isolate flex-center cursor-pointer px-3 py-1 transition-[color,opacity] duration-150 first:rounded-l-xs last:rounded-r-xs motion-reduce:transition-none',
              { 'text-primary-foreground': selected },
              { 'opacity-50': !selected },
              itemClass,
            )}
            onClick={() => setSelectedValue(value)}
            aria-label={label ?? String(value)}
            aria-pressed={selected}
            key={value}
          >
            {icon && <span className="flex-center shrink-0">{React.createElement(icon, { className: 'size-4' })}</span>}
            {label && (
              <span
                className={cn(
                  'origin-left overflow-hidden whitespace-nowrap transition-[max-width,margin,opacity,transform] duration-150 ease-out motion-reduce:transition-none',
                  selected ? 'ml-1.5 max-w-32 translate-x-0 opacity-100' : 'ml-0 max-w-0 -translate-x-1 opacity-0',
                )}
                aria-hidden={!selected}
              >
                {label}
              </span>
            )}
            <span
              aria-hidden="true"
              className={cn(
                'absolute inset-0 -z-10 rounded-sm bg-gradient-shoka-button transition-opacity duration-150 motion-reduce:transition-none',
                selected ? 'opacity-100' : 'opacity-0',
                indicateClass,
              )}
            />
          </button>
        );
      })}
    </div>
  );
};

export default React.memo(Segmented);
