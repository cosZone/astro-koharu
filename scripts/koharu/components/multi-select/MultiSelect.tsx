import { Box, Text, useInput } from 'ink';
import { useState } from 'react';

export interface MultiSelectOption {
  label: string;
  value: string;
  hint?: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  defaultValue?: readonly string[];
  /** Called with the checked values in option order; an empty list means the step was skipped. */
  onSubmit: (values: string[]) => void;
}

/** Checkbox list: ↑/↓ (j/k) move, space toggles, enter confirms. */
export function MultiSelect({ options, defaultValue = [], onSubmit }: MultiSelectProps) {
  const [focused, setFocused] = useState(0);
  const [checked, setChecked] = useState(() => new Set(defaultValue));

  useInput(
    (input, key) => {
      if (key.downArrow || (input === 'j' && !key.ctrl)) setFocused((index) => (index + 1) % options.length);
      else if (key.upArrow || (input === 'k' && !key.ctrl))
        setFocused((index) => (index - 1 + options.length) % options.length);
      else if (input === ' ') {
        const value = options[focused].value;
        setChecked((previous) => {
          const next = new Set(previous);
          if (!next.delete(value)) next.add(value);
          return next;
        });
      } else if (key.return) onSubmit(options.filter((option) => checked.has(option.value)).map((option) => option.value));
    },
    { isActive: options.length > 0 },
  );

  return (
    <Box flexDirection="column">
      {options.map((option, index) => (
        <Text key={option.value} color={index === focused ? 'blue' : undefined}>
          {index === focused ? '❯ ' : '  '}
          {checked.has(option.value) ? '◉ ' : '○ '}
          {option.label}
          {option.hint && index === focused && <Text dimColor> {option.hint}</Text>}
        </Text>
      ))}
      <Text dimColor> 空格选择，回车确认；不选直接回车即跳过</Text>
    </Box>
  );
}
