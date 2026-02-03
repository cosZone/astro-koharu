import { Box, Text } from 'ink';

interface CycleSelectOptionProps {
  label: string;
  isFocused: boolean;
}

/**
 * Single option item for CycleSelect
 * Shows a highlight indicator when focused
 */
export function CycleSelectOption({ label, isFocused }: CycleSelectOptionProps) {
  return (
    <Box>
      <Text color={isFocused ? 'blue' : undefined}>
        {isFocused ? '❯ ' : '  '}
        {label}
      </Text>
    </Box>
  );
}
