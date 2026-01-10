import { Box, Text } from 'ink';
import { BACKUP_DIR, getBackupList, usePressAnyKey } from './shared.js';

interface ListAppProps {
  showReturnHint?: boolean;
  onComplete?: () => void;
}

export function ListApp({ showReturnHint = false, onComplete }: ListAppProps) {
  const backups = getBackupList();

  // 监听按键返回主菜单
  usePressAnyKey(showReturnHint, () => {
    onComplete?.();
  });

  // 如果不显示返回提示，直接退出
  if (!showReturnHint) {
    setTimeout(() => onComplete?.(), 100);
  }

  if (backups.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">没有找到备份文件</Text>
        <Box marginTop={1}>
          <Text dimColor>备份目录: {BACKUP_DIR}</Text>
        </Box>
        <Text dimColor>使用 'pnpm koharu backup' 创建备份</Text>
        {showReturnHint && (
          <Box marginTop={1}>
            <Text dimColor>按任意键返回主菜单...</Text>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box flexDirection="column">
        {backups.map((backup) => (
          <Box key={backup.name}>
            <Text color="green">{'  '}* </Text>
            <Text>{backup.name}</Text>
            <Text color="yellow"> {backup.sizeFormatted}</Text>
            {backup.type === 'full' && <Text color="cyan"> [完整]</Text>}
            {backup.type === 'basic' && <Text color="green"> [基础]</Text>}
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>共 {backups.length} 个备份</Text>
      </Box>
      {showReturnHint && (
        <Box marginTop={1}>
          <Text dimColor>按任意键返回主菜单...</Text>
        </Box>
      )}
    </Box>
  );
}
