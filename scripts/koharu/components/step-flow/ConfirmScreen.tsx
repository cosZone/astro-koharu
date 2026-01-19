import { ConfirmInput } from '@inkjs/ui';
import { Box, Text } from 'ink';

export interface ConfirmScreenProps {
  title: string;
  steps: Array<{ label: string; value: string }>;
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmScreen({ title, steps, confirmText = '确认创建?', onConfirm, onCancel }: ConfirmScreenProps) {
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {title}
        </Text>
      </Box>

      {steps.map((step) => (
        <Text key={step.label}>
          <Text color="green">✓ </Text>
          <Text>{step.label}: </Text>
          <Text color="cyan">{step.value}</Text>
        </Text>
      ))}

      <Box marginTop={1} flexDirection="column">
        <Text>{confirmText}</Text>
        <ConfirmInput onConfirm={onConfirm} onCancel={onCancel} />
      </Box>
    </Box>
  );
}
