import { LazyMotionProvider } from '@components/common/LazyMotionProvider';
import { useControlledState } from '@hooks/useControlledState';
import { cn } from '@lib/utils';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
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
  id?: string;
  value?: T; // 受控
};

export const Segmented = <T extends string | number = string | number>({
  options,
  defaultValue,
  onChange,
  className,
  id,
  indicateClass,
  itemClass,
  value,
}: SegmentedProps<T>) => {
  const [selectedValue, setSelectedValue] = useControlledState<T>({
    value,
    defaultValue: (defaultValue ?? options[0]?.value ?? '') as T,
    onChange,
  });
  const shouldReduceMotion = useReducedMotion();

  return (
    <LazyMotionProvider>
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
            <m.button
              type="button"
              className={cn(
                'relative flex-center cursor-pointer gap-1.5 px-3 py-1 first:rounded-l-xs last:rounded-r-xs',
                { 'text-primary-foreground': selected },
                { 'opacity-50': !selected },
                itemClass,
              )}
              onClick={() => setSelectedValue(value)}
              aria-label={label ?? String(value)}
              aria-pressed={selected}
              key={value}
              layout={!shouldReduceMotion}
              transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
            >
              {/* Icon */}
              {icon && <span className="flex-center shrink-0">{React.createElement(icon, { className: 'w-4 h-4' })}</span>}

              {/* Show the text label only for the selected option. */}
              <AnimatePresence initial={false} mode="wait">
                {selected && label && (
                  <m.span
                    layout={!shouldReduceMotion}
                    initial={shouldReduceMotion ? false : { opacity: 0, scaleX: 0.8, x: -4 }}
                    animate={{ opacity: 1, scaleX: 1, x: 0 }}
                    exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scaleX: 0.8, x: -4 }}
                    transition={
                      shouldReduceMotion
                        ? { duration: 0 }
                        : {
                            layout: { duration: 0.2, ease: 'easeInOut' },
                            transform: { duration: 0.2, ease: 'easeInOut' },
                            opacity: { duration: 0.15, ease: 'easeInOut' },
                          }
                    }
                    className="origin-left whitespace-nowrap"
                  >
                    {label}
                  </m.span>
                )}
              </AnimatePresence>

              {/* Selected background */}
              {selected && (
                <m.div
                  layoutId={`segmented_selected_bg_${id ?? 'default'}`}
                  className={cn('absolute inset-0 -z-10 rounded-sm bg-gradient-shoka-button', indicateClass)}
                  transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
                  style={{ willChange: shouldReduceMotion ? 'auto' : 'transform' }}
                />
              )}
            </m.button>
          );
        })}
      </div>
    </LazyMotionProvider>
  );
};

export default React.memo(Segmented);
