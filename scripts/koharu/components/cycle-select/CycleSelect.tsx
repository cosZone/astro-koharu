import { Box, Text, useInput } from 'ink';
import { CycleSelectOption } from './CycleSelectOption';
import type { CycleSelectProps } from './types';
import { useCycleSelectState } from './useCycleSelectState';

const DEFAULT_VISIBLE_COUNT = 5;

/**
 * A Select component with cyclic navigation
 *
 * - Pressing up at the first item wraps to the last item
 * - Pressing down at the last item wraps to the first item
 *
 * API compatible with @inkjs/ui Select component
 */
export function CycleSelect({ options, onChange, visibleOptionCount = DEFAULT_VISIBLE_COUNT, defaultValue }: CycleSelectProps) {
  const { state, dispatch } = useCycleSelectState(options, visibleOptionCount, defaultValue);
  const hasOptions = options.length > 0;

  useInput(
    (input, key) => {
      if (key.downArrow || (input === 'j' && !key.ctrl)) {
        dispatch({ type: 'focus-next-option' });
      } else if (key.upArrow || (input === 'k' && !key.ctrl)) {
        dispatch({ type: 'focus-previous-option' });
      } else if (key.return) {
        onChange(state.focusedValue);
      }
    },
    { isActive: hasOptions },
  );

  // Handle empty options case
  if (!hasOptions) {
    return null;
  }

  // Get visible options based on current scroll position
  const visibleOptions = options.slice(state.visibleFromIndex, state.visibleToIndex);

  // Show scroll indicators
  const hasMoreAbove = state.visibleFromIndex > 0;
  const hasMoreBelow = state.visibleToIndex < options.length;

  return (
    <Box flexDirection="column">
      {hasMoreAbove && (
        <Box>
          <Text dimColor> ↑ 更多选项</Text>
        </Box>
      )}
      {visibleOptions.map((option) => (
        <CycleSelectOption key={option.value} label={option.label} isFocused={option.value === state.focusedValue} />
      ))}
      {hasMoreBelow && (
        <Box>
          <Text dimColor> ↓ 更多选项</Text>
        </Box>
      )}
    </Box>
  );
}
