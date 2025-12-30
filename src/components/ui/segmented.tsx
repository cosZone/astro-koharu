import { cn } from '@lib/utils';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import React, { useCallback, useEffect, useState } from 'react';

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
  const [_value, setValue] = useState<T>(() => (value ?? defaultValue ?? options[0]?.value ?? '') as T);
  const shouldReduceMotion = useReducedMotion();

  const select = useCallback(
    (value: T) => {
      setValue(value);
      onChange?.(value);
    },
    [onChange],
  );
  const isSelected = useCallback((selectedValue: T) => _value === selectedValue, [_value]);

  useEffect(() => {
    if (value) setValue(value);
  }, [value]);

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
        const selected = isSelected(value);
        return (
          <motion.div
            className={cn(
              'relative flex-center cursor-pointer gap-1.5 px-3 py-1 first:rounded-l-xs last:rounded-r-xs',
              { 'text-primary-foreground': selected },
              { 'opacity-50': !selected },
              itemClass,
            )}
            onClick={() => select(value)}
            key={value}
            layout={!shouldReduceMotion}
            transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
          >
            {/* 图标 */}
            {icon && <span className="flex-center shrink-0">{React.createElement(icon, { className: 'w-4 h-4' })}</span>}

            {/* 文字标签 - 只在选中时显示 */}
            <AnimatePresence initial={false} mode="wait">
              {selected && label && (
                <motion.span
                  initial={shouldReduceMotion ? undefined : { width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={shouldReduceMotion ? undefined : { width: 0, opacity: 0 }}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : {
                          width: { duration: 0.2, ease: 'easeInOut' },
                          opacity: { duration: 0.15, ease: 'easeInOut' },
                        }
                  }
                  className="overflow-hidden whitespace-nowrap"
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>

            {/* 选中背景 */}
            {selected && (
              <motion.div
                layoutId={`segmented_selected_bg_${id ?? 'default'}`}
                className={cn('absolute inset-0 -z-10 rounded-sm bg-gradient-shoka-button', indicateClass)}
                transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
                style={{ willChange: shouldReduceMotion ? 'auto' : 'transform' }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default React.memo(Segmented);
