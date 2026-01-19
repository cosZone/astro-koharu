import { Box, Text } from 'ink';

export interface CreatingScreenProps {
  title: string;
  message: string;
}

export function CreatingScreen({ title, message }: CreatingScreenProps) {
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {title}
        </Text>
      </Box>
      <Text>{message}</Text>
    </Box>
  );
}
