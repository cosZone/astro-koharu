import { Box, Text } from 'ink';
import type { ReactNode } from 'react';

export interface StepItemProps {
  label: string;
  status: 'completed' | 'active' | 'pending';
  completedValue?: string;
  children?: ReactNode;
  error?: string;
}

export function StepItem({ label, status, completedValue, children, error }: StepItemProps) {
  if (status === 'completed') {
    return (
      <Text>
        <Text color="green">✓ </Text>
        <Text>{label}: </Text>
        <Text color="cyan">{completedValue}</Text>
      </Text>
    );
  }

  if (status === 'active') {
    return (
      <Box flexDirection="column">
        <Text>
          <Text color="white">{'> '}</Text>
          <Text>{label}:</Text>
        </Text>
        {children}
        {error && (
          <Text color="red" dimColor>
            {error}
          </Text>
        )}
      </Box>
    );
  }

  return <Text dimColor>○ {label}</Text>;
}
