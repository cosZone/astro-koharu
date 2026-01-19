import { Box, Text } from 'ink';

export interface DoneScreenProps {
  title: string;
  message: string;
  detail?: string;
  showReturnHint?: boolean;
}

export function DoneScreen({ title, message, detail, showReturnHint }: DoneScreenProps) {
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {title}
        </Text>
      </Box>
      <Text bold color="green">
        {message}
      </Text>
      {detail && <Text dimColor>{detail}</Text>}
      {showReturnHint && (
        <Box marginTop={1}>
          <Text dimColor>按任意键返回主菜单...</Text>
        </Box>
      )}
    </Box>
  );
}
