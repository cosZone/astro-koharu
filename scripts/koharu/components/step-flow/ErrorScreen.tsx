import { Box, Text } from 'ink';

export interface ErrorScreenProps {
  title: string;
  error: string;
  showReturnHint?: boolean;
}

export function ErrorScreen({ title, error, showReturnHint }: ErrorScreenProps) {
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {title}
        </Text>
      </Box>
      <Text bold color="red">
        操作失败
      </Text>
      <Text color="red">{error}</Text>
      {showReturnHint && (
        <Box marginTop={1}>
          <Text dimColor>按任意键返回主菜单...</Text>
        </Box>
      )}
    </Box>
  );
}
