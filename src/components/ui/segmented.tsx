import { animation } from '@constants/design-tokens';
import { useControlledState } from '@hooks/useControlledState';
import { useGlideIndicator } from '@hooks/useGlideIndicator';
import { readMotionLevel } from '@lib/motion-level';
import { cn } from '@lib/utils';
import React, { useRef } from 'react';

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

const ICON_POP: Keyframe[] = [
  { scale: 0.7, easing: `cubic-bezier(${animation.bezier.outQuart.join(',')})` },
  { scale: 1.12, offset: 0.45, easing: 'ease-in-out' },
  { scale: 1 },
];

function popIcon(button: HTMLElement) {
  if (readMotionLevel() !== 'lively') return;
  button.querySelector('.segmented-icon')?.animate(ICON_POP, { duration: 460 });
}

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
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  useGlideIndicator(trackRef, thumbRef, selectedValue === undefined ? null : String(selectedValue));

  return (
    <div
      ref={trackRef}
      className={cn('segmented flex w-fit select-none rounded-xl bg-muted p-1 font-semibold text-xs', className)}
    >
      <span ref={thumbRef} aria-hidden="true" className={cn('segmented-thumb', indicateClass)} />
      {options.map((option) => {
        if (!option) return null;
        const { label, value, icon } = option;
        const selected = selectedValue === value;
        return (
          <button
            type="button"
            className={cn('segmented-item flex-center cursor-pointer rounded-lg px-3 py-1 outline-none', itemClass)}
            onClick={(event) => {
              if (!selected) popIcon(event.currentTarget);
              setSelectedValue(value);
            }}
            aria-label={label ?? String(value)}
            aria-pressed={selected}
            data-selected={selected || undefined}
            data-glide-key={String(value)}
            key={value}
          >
            <span className="segmented-content">
              {icon && <span className="segmented-icon">{React.createElement(icon, { className: 'size-4' })}</span>}
              {label && (
                <span className="segmented-label" aria-hidden={!selected}>
                  <span className="segmented-label-clip">
                    <span className="segmented-label-text">{label}</span>
                  </span>
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default React.memo(Segmented);
