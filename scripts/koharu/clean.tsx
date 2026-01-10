import { ConfirmInput, MultiSelect } from '@inkjs/ui';
import { Box, Text } from 'ink';
import { useCallback, useEffect, useState } from 'react';
import {
  AUTO_EXIT_DELAY,
  type BackupInfo,
  deleteBackups,
  formatSize,
  getBackupList,
  usePressAnyKey,
  useRetimer,
} from './shared';

type CleanStatus = 'selecting' | 'confirming' | 'deleting' | 'done' | 'cancelled';

interface CleanAppProps {
  keepCount?: number | null;
  showReturnHint?: boolean;
  onComplete?: () => void;
}

const AUTO_CONFIRM_DELAY = 500;

export function CleanApp({ keepCount = null, showReturnHint = false, onComplete }: CleanAppProps) {
  const [backups] = useState<BackupInfo[]>(() => getBackupList());
  const [status, setStatus] = useState<CleanStatus>(keepCount !== null ? 'confirming' : 'selecting');
  const [selectedPaths, setSelectedPaths] = useState<string[]>(() => {
    // 如果有 --keep 参数，自动选择要删除的备份
    if (keepCount !== null && backups.length > keepCount) {
      return backups.slice(keepCount).map((b) => b.path);
    }
    return [];
  });
  const [deletedCount, setDeletedCount] = useState(0);
  const [freedSpace, setFreedSpace] = useState(0);
  const retimer = useRetimer();

  const handleSubmit = (paths: string[]) => {
    if (paths.length > 0) {
      setSelectedPaths(paths);
      setStatus('confirming');
    } else {
      // 没有选择任何项目，视为取消
      onComplete?.();
    }
  };

  const handleConfirm = useCallback(() => {
    setStatus('deleting');

    const result = deleteBackups(selectedPaths);

    setDeletedCount(result.deletedCount);
    setFreedSpace(result.freedSpace);
    setStatus('done');
    if (!showReturnHint) {
      retimer(setTimeout(() => onComplete?.(), AUTO_EXIT_DELAY));
    }
  }, [selectedPaths, showReturnHint, onComplete, retimer]);

  const handleCancel = useCallback(() => {
    setStatus('cancelled');
    if (!showReturnHint) {
      retimer(setTimeout(() => onComplete?.(), AUTO_EXIT_DELAY));
    }
  }, [showReturnHint, onComplete, retimer]);

  // 监听按键返回主菜单
  usePressAnyKey((status === 'done' || status === 'cancelled') && showReturnHint, () => {
    onComplete?.();
  });

  // 自动模式：如果有 --keep 参数且有备份要删除，直接确认
  useEffect(() => {
    if (keepCount !== null && status === 'confirming' && selectedPaths.length > 0) {
      // 给用户一点时间看到信息
      retimer(setTimeout(() => handleConfirm(), AUTO_CONFIRM_DELAY));
    }
    return () => retimer();
  }, [status, selectedPaths.length, handleConfirm, keepCount, retimer]);

  // 处理无需操作时自动退出
  const shouldAutoExit = backups.length === 0 || (keepCount !== null && selectedPaths.length === 0);
  useEffect(() => {
    if (shouldAutoExit && !showReturnHint) {
      retimer(setTimeout(() => onComplete?.(), AUTO_EXIT_DELAY));
    }
    return () => retimer();
  }, [shouldAutoExit, showReturnHint, onComplete, retimer]);

  if (backups.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">没有找到备份文件</Text>
        {showReturnHint && (
          <Box marginTop={1}>
            <Text dimColor>按任意键返回主菜单...</Text>
          </Box>
        )}
      </Box>
    );
  }

  if (keepCount !== null && selectedPaths.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="green">
          当前有 {backups.length} 个备份，保留 {keepCount} 个，无需清理
        </Text>
        {showReturnHint && (
          <Box marginTop={1}>
            <Text dimColor>按任意键返回主菜单...</Text>
          </Box>
        )}
      </Box>
    );
  }

  const selectedBackups = backups.filter((b) => selectedPaths.includes(b.path));
  const totalSize = selectedBackups.reduce((sum, b) => sum + b.size, 0);

  return (
    <Box flexDirection="column">
      {status === 'selecting' && (
        <Box flexDirection="column">
          <Text>选择要删除的备份（空格选择，回车确认，不选直接回车取消）:</Text>
          <Box marginTop={1}>
            <MultiSelect
              options={backups.map((b) => ({
                label: `${b.name}  ${b.sizeFormatted}  ${b.type === 'full' ? '[完整]' : '[基础]'}`,
                value: b.path,
              }))}
              onChange={setSelectedPaths}
              onSubmit={handleSubmit}
            />
          </Box>
        </Box>
      )}

      {status === 'confirming' && (
        <Box flexDirection="column">
          {keepCount !== null && (
            <Text>
              保留最近 <Text color="green">{keepCount}</Text> 个备份，删除以下{' '}
              <Text color="yellow">{selectedPaths.length}</Text> 个:
            </Text>
          )}
          {selectedBackups.map((b) => (
            <Text key={b.path}>
              <Text color="red">{'  '}- </Text>
              <Text>{b.name}</Text>
              <Text dimColor> ({b.sizeFormatted})</Text>
            </Text>
          ))}
          <Box marginTop={1}>
            <Text>
              将释放: <Text color="yellow">{formatSize(totalSize)}</Text>
            </Text>
          </Box>
          {keepCount === null && (
            <Box marginTop={1}>
              <Text color="yellow">确认删除 {selectedPaths.length} 个备份?</Text>
              <Box marginLeft={1}>
                <ConfirmInput onConfirm={handleConfirm} onCancel={handleCancel} />
              </Box>
            </Box>
          )}
        </Box>
      )}

      {status === 'deleting' && (
        <Text>
          <Text color="yellow">正在删除...</Text>
        </Text>
      )}

      {status === 'done' && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold color="green">
              清理完成
            </Text>
          </Box>
          <Text>
            已删除 <Text color="green">{deletedCount}</Text> 个备份，释放 <Text color="yellow">{formatSize(freedSpace)}</Text>{' '}
            空间
          </Text>
          {showReturnHint && (
            <Box marginTop={1}>
              <Text dimColor>按任意键返回主菜单...</Text>
            </Box>
          )}
        </Box>
      )}

      {status === 'cancelled' && (
        <Box flexDirection="column">
          <Text color="yellow">已取消</Text>
          {showReturnHint && (
            <Box marginTop={1}>
              <Text dimColor>按任意键返回主菜单...</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
