import { useGlideIndicator } from '@hooks/useGlideIndicator';
import { type ReactNode, useRef } from 'react';
import EditorIcon from './EditorIcon';

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: string;
  /** Custom leading graphic, used instead of a built-in editor icon. */
  media?: ReactNode;
  title?: string;
}

interface Props<T extends string> {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

export default function ViewSwitch<T extends string>({ options, value, onChange, label }: Props<T>) {
  const track = useRef<HTMLFieldSetElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  useGlideIndicator(track, thumb, value);
  return (
    <fieldset ref={track} className="segmented editor-switch" aria-label={label}>
      <span ref={thumb} aria-hidden="true" className="segmented-thumb" />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="segmented-item editor-switch-item"
          aria-pressed={option.value === value}
          data-selected={option.value === value || undefined}
          data-glide-key={option.value}
          title={option.title}
          onClick={() => onChange(option.value)}
        >
          {option.media ?? (option.icon && <EditorIcon name={option.icon} />)}
          <span>{option.label}</span>
        </button>
      ))}
    </fieldset>
  );
}
