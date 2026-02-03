import path from 'node:path';
import { ConfirmInput, Spinner } from '@inkjs/ui';
import { Box, Text } from 'ink';
import { useCallback, useEffect, useState } from 'react';
import { CycleSelect as Select } from './components';
import {
  AUTO_EXIT_DELAY,
  type BackupInfo,
  getBackupList,
  getRestorePreview,
  type RestorePreviewItem,
  restoreBackup,
  tarExtractManifest,
  usePressAnyKey,
  useRetimer,
  validateBackupFilePath,
} from './shared';

type RestoreStatus = 'selecting' | 'confirming' | 'restoring' | 'done' | 'error' | 'cancelled';

interface RestoreAppProps {
  initialBackupFile?: string;
  dryRun?: boolean;
  force?: boolean;
  showReturnHint?: boolean;
  onComplete?: () => void;
}

export function RestoreApp({
  initialBackupFile,
  dryRun = false,
  force = false,
  showReturnHint = false,
  onComplete,
}: RestoreAppProps) {
  const [status, setStatus] = useState<RestoreStatus>(initialBackupFile ? 'confirming' : 'selecting');
  const [selectedBackup, setSelectedBackup] = useState<string>(initialBackupFile || '');
  const [restoredFiles, setRestoredFiles] = useState<(RestorePreviewItem | string)[]>([]);
  const [error, setError] = useState<string>('');
  const [manifest, setManifest] = useState<{ type?: string; version?: string; timestamp?: string } | null>(null);

  const [backups] = useState<BackupInfo[]>(() => getBackupList());
  const retimer = useRetimer();

  useEffect(() => {
    if (selectedBackup && !manifest) {
      try {
        const validatedPath = validateBackupFilePath(selectedBackup);
        const data = tarExtractManifest(validatedPath);
        if (data) {
          setManifest(JSON.parse(data));
        }
      } catch {
        // ignore
      }
    }
  }, [selectedBackup, manifest]);

  const runDryRun = useCallback(() => {
    try {
      const previewFiles = getRestorePreview(selectedBackup);
      setRestoredFiles(previewFiles);
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
  }, [selectedBackup, showReturnHint, onComplete, retimer]);

  const runRestore = useCallback(() => {
    try {
      setStatus('restoring');
      const restored = restoreBackup(selectedBackup);
      setRestoredFiles(restored);
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
  }, [selectedBackup, showReturnHint, onComplete, retimer]);

  useEffect(() => {
    if (force && selectedBackup && status === 'confirming') {
      runRestore();
    }
  }, [selectedBackup, status, runRestore, force]);

  function handleSelect(value: string) {
    if (value === 'cancel') {
      onComplete?.();
      return;
    }
    setSelectedBackup(value);
    setStatus('confirming');
  }

  function handleConfirm() {
    if (dryRun) {
      runDryRun();
    } else {
      runRestore();
    }
  }

  const handleCancel = useCallback(() => {
    setStatus('cancelled');
    if (!showReturnHint) {
      retimer(setTimeout(() => onComplete?.(), AUTO_EXIT_DELAY));
    }
  }, [showReturnHint, onComplete, retimer]);

  // 监听按键返回主菜单
  usePressAnyKey((status === 'done' || status === 'error' || status === 'cancelled') && showReturnHint, () => {
    onComplete?.();
  });

  if (backups.length === 0 && status === 'selecting') {
    return (
      <Box flexDirection="column">
        <Text color="yellow">没有找到备份文件</Text>
        <Text dimColor>使用 'pnpm koharu backup' 创建备份</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {status === 'selecting' && (
        <Box flexDirection="column">
          <Text>选择要还原的备份:</Text>
          <Select
            options={[
              ...backups.map((b) => ({
                label: `${b.name}  ${b.sizeFormatted}  ${b.type === 'full' ? '[完整]' : '[基础]'}`,
                value: b.path,
              })),
              { label: '取消', value: 'cancel' },
            ]}
            onChange={handleSelect}
          />
        </Box>
      )}

      {status === 'confirming' && selectedBackup && (
        <Box flexDirection="column">
          <Text>
            备份文件: <Text color="cyan">{path.basename(selectedBackup)}</Text>
          </Text>
          {manifest && (
            <>
              <Text>
                备份类型: <Text color="yellow">{manifest.type}</Text>
              </Text>
              <Text>
                主题版本: <Text color="yellow">{manifest.version}</Text>
              </Text>
              <Text>
                备份时间: <Text color="yellow">{manifest.timestamp}</Text>
              </Text>
            </>
          )}
          <Box marginTop={1} marginBottom={1}>
            <Text color="yellow">{dryRun ? '[预览模式] ' : ''}确认还原? 此操作将覆盖现有文件</Text>
          </Box>
          {!force && <ConfirmInput onConfirm={handleConfirm} onCancel={handleCancel} />}
        </Box>
      )}

      {status === 'restoring' && (
        <Box>
          <Spinner label="正在还原..." />
        </Box>
      )}

      {status === 'done' && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold color="green">
              {dryRun ? '预览模式' : '还原完成'}
            </Text>
          </Box>
          {restoredFiles.map((item) => {
            const isPreviewItem = typeof item !== 'string';
            const filePath = isPreviewItem ? item.path : item;
            const fileCount = isPreviewItem ? item.fileCount : 0;
            return (
              <Text key={filePath}>
                <Text color="green">{'  '}+ </Text>
                <Text>{filePath}</Text>
                {isPreviewItem && fileCount > 1 && <Text dimColor> ({fileCount} 文件)</Text>}
              </Text>
            );
          })}
          <Box marginTop={1}>
            <Text>
              {dryRun ? '将' : '已'}还原: <Text color="green">{restoredFiles.length}</Text> 项
            </Text>
          </Box>
          {dryRun && (
            <Box marginTop={1}>
              <Text color="yellow">这是预览模式，没有文件被修改</Text>
            </Box>
          )}
          {!dryRun && (
            <Box flexDirection="column" marginTop={1}>
              <Text dimColor>后续步骤:</Text>
              <Text dimColor>{'  '}1. pnpm install # 安装依赖</Text>
              <Text dimColor>{'  '}2. pnpm build # 构建项目</Text>
              <Text dimColor>{'  '}3. pnpm dev # 启动开发服务器</Text>
            </Box>
          )}
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

      {status === 'error' && (
        <Box flexDirection="column">
          <Text bold color="red">
            还原失败
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
