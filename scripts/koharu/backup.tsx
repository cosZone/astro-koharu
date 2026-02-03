import path from 'node:path';
import { Spinner } from '@inkjs/ui';
import { Box, Text } from 'ink';
import { useCallback, useEffect, useState } from 'react';
import { CycleSelect as Select } from './components';
import { AUTO_EXIT_DELAY, type BackupResult, formatSize, runBackup, usePressAnyKey, useRetimer } from './shared';

type BackupStatus = 'selecting' | 'pending' | 'backing' | 'compressing' | 'done' | 'error';

interface BackupAppProps {
  initialFull?: boolean;
  showReturnHint?: boolean;
  onComplete?: () => void;
}

export function BackupApp({ initialFull = false, showReturnHint = false, onComplete }: BackupAppProps) {
  const [status, setStatus] = useState<BackupStatus>(initialFull ? 'pending' : 'selecting');
  const [isFullBackup, setIsFullBackup] = useState(initialFull);
  const [results, setResults] = useState<BackupResult[]>([]);
  const [backupFile, setBackupFile] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [error, setError] = useState<string>('');
  const retimer = useRetimer();

  const handleModeSelect = (value: string) => {
    if (value === 'cancel') {
      onComplete?.();
      return;
    }
    setIsFullBackup(value === 'full');
    setStatus('pending');
  };

  const executeBackup = useCallback(() => {
    try {
      setStatus('backing');

      const output = runBackup(isFullBackup, (progressResults) => {
        setResults(progressResults);
      });

      setStatus('compressing');
      // Note: compression is synchronous in runBackup, state update shows progress

      setFileSize(formatSize(output.fileSize));
      setBackupFile(output.backupFile);
      setResults(output.results);
      setStatus('done');

      if (!showReturnHint) {
        retimer(setTimeout(() => onComplete?.(), AUTO_EXIT_DELAY));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
      if (!showReturnHint) {
        retimer(setTimeout(() => onComplete?.(), AUTO_EXIT_DELAY));
      }
    }
  }, [isFullBackup, showReturnHint, onComplete, retimer]);

  useEffect(() => {
    if (status === 'pending') {
      executeBackup();
    }
  }, [status, executeBackup]);

  const successCount = results.filter((r) => r.success).length;
  const skippedCount = results.filter((r) => r.skipped).length;

  // 监听按键返回主菜单
  usePressAnyKey((status === 'done' || status === 'error') && showReturnHint, () => {
    onComplete?.();
  });

  return (
    <Box flexDirection="column">
      {status === 'selecting' && (
        <Box flexDirection="column" marginBottom={1}>
          <Text>选择备份模式:</Text>
          <Select
            options={[
              { label: '基础备份（博客、配置、头像、.env）', value: 'basic' },
              { label: '完整备份（包含所有图片和生成的资产）', value: 'full' },
              { label: '取消', value: 'cancel' },
            ]}
            onChange={handleModeSelect}
          />
        </Box>
      )}

      {status !== 'selecting' && (
        <Box marginBottom={1}>
          <Text>
            模式:{' '}
            <Text color="yellow" bold>
              {isFullBackup ? '完整备份' : '基础备份'}
            </Text>
          </Text>
        </Box>
      )}

      {(status === 'backing' || status === 'compressing') && (
        <Box marginBottom={1}>
          <Spinner label={status === 'backing' ? '正在备份文件...' : '正在创建压缩包...'} />
        </Box>
      )}

      {results.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          {results.map((result) => (
            <Box key={result.item.dest}>
              <Text>
                {result.success ? <Text color="green">{'  '}+ </Text> : <Text color="yellow">{'  '}- </Text>}
                <Text>{result.item.label}</Text>
                {result.skipped && <Text dimColor> (不存在，跳过)</Text>}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {status === 'done' && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold color="green">
              备份完成
            </Text>
          </Box>
          <Text>
            备份文件: <Text color="cyan">{path.basename(backupFile)}</Text>
          </Text>
          <Text>
            文件大小: <Text color="yellow">{fileSize}</Text>
          </Text>
          <Text>
            备份项目: <Text color="green">{successCount}</Text> 个
          </Text>
          {skippedCount > 0 && (
            <Text>
              跳过项目: <Text color="yellow">{skippedCount}</Text> 个
            </Text>
          )}
          <Box marginTop={1}>
            <Text dimColor>提示: 更新主题后使用 'pnpm koharu restore' 还原备份</Text>
          </Box>
          {showReturnHint && (
            <Box marginTop={1}>
              <Text dimColor>按任意键返回主菜单...</Text>
            </Box>
          )}
        </Box>
      )}

      {status === 'error' && (
        <Box flexDirection="column">
          <Text bold color="red">
            备份失败
          </Text>
          <Text color="red">{error}</Text>
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
