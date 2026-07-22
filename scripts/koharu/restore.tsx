import path from 'node:path';
import { ConfirmInput, Spinner } from '@inkjs/ui';
import { Box, Text } from 'ink';
import { useCallback, useEffect, useState } from 'react';
import { CycleSelect as Select } from './components';
import {
  AUTO_EXIT_DELAY,
  type BackupInfo,
  type ContentMigrationPlan,
  getRestorableBackupList,
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
  const [migration, setMigration] = useState<ContentMigrationPlan | null>(null);
  const [error, setError] = useState<string>('');
  const [manifest, setManifest] = useState<{
    type?: string;
    version?: string;
    timestamp?: string;
    schemaVersion?: number;
  } | null>(null);

  const [backups] = useState<BackupInfo[]>(() => getRestorableBackupList());
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
      setRestoredFiles(previewFiles.items);
      setMigration(previewFiles.migration);
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
      const output = restoreBackup(selectedBackup);
      setRestoredFiles(output.restoredFiles);
      setMigration(output.migration);
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
      if (dryRun) runDryRun();
      else runRestore();
    }
  }, [dryRun, force, runDryRun, runRestore, selectedBackup, status]);

  useEffect(() => {
    if (showReturnHint) return;
    if (status === 'error' || (status === 'done' && migration && migration.errors.length > 0)) {
      process.exitCode = 1;
    }
  }, [migration, showReturnHint, status]);

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
              <Box key={filePath} flexDirection="column">
                <Text>
                  <Text color="green">{'  '}+ </Text>
                  <Text>{filePath}</Text>
                  {isPreviewItem && fileCount > 1 && <Text dimColor> ({fileCount} 文件)</Text>}
                </Text>
                {isPreviewItem && item.deletedFiles.length > 0 && (
                  <Box flexDirection="column">
                    <Text color="red">
                      {'  '}- 将先删除 {item.deletedFiles.length} 个现有文件
                    </Text>
                    {item.deletedFiles.slice(0, 10).map((deletedFile) => (
                      <Text key={deletedFile} color="red" dimColor>
                        {'    '}
                        {deletedFile}
                      </Text>
                    ))}
                    {item.deletedFiles.length > 10 && (
                      <Text color="red" dimColor>
                        {'    '}... 还有 {item.deletedFiles.length - 10} 个
                      </Text>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
          <Box marginTop={1}>
            <Text>
              {dryRun ? '将' : '已'}还原: <Text color="green">{restoredFiles.length}</Text> 项
            </Text>
          </Box>
          {!dryRun && migration && migration.changes.length > 0 && migration.errors.length === 0 && (
            <Box marginTop={1}>
              <Text color="green">已自动迁移 {migration.changes.length} 篇历史文章的稳定链接</Text>
            </Box>
          )}
          {!dryRun && migration && migration.errors.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text color="red" bold>
                有 {migration.errors.length} 篇文章无法自动迁移
              </Text>
              {migration.errors.slice(0, 5).map((issue) => (
                <Text key={`${issue.file}:${issue.message}`} color="red">
                  {'  '}- {issue.file}: {issue.message}
                </Text>
              ))}
              <Text color="yellow">修正后运行: pnpm koharu migrate</Text>
            </Box>
          )}
          {dryRun && migration && migration.changes.length > 0 && migration.errors.length === 0 && (
            <Box marginTop={1}>
              <Text color="yellow">还原后将自动迁移 {migration.changes.length} 篇历史文章的稳定链接</Text>
            </Box>
          )}
          {dryRun && migration && migration.errors.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text color="red" bold>
                预览发现 {migration.errors.length} 个内容迁移问题
              </Text>
              {migration.errors.slice(0, 5).map((issue) => (
                <Text key={`${issue.file}:${issue.message}`} color="red">
                  {'  '}- {issue.file}: {issue.message}
                </Text>
              ))}
            </Box>
          )}
          {dryRun && (
            <Box marginTop={1}>
              <Text color="yellow">这是预览模式，没有文件被修改</Text>
            </Box>
          )}
          {!dryRun && (
            <Box flexDirection="column" marginTop={1}>
              {manifest?.type === 'basic' && (
                <Text color="yellow">基础备份不含生成资产；文章有变化时请运行 pnpm koharu generate all</Text>
              )}
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
