import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Select, Spinner } from '@inkjs/ui';
import { Box, Text } from 'ink';
import { useCallback, useEffect, useState } from 'react';
import { BACKUP_DIR, type BackupItem, backupItems, formatSize, getVersion, PROJECT_ROOT, usePressAnyKey } from './shared.js';

type BackupStatus = 'selecting' | 'pending' | 'backing' | 'compressing' | 'done' | 'error';

interface BackupResult {
  item: BackupItem;
  success: boolean;
  skipped: boolean;
}

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

  const handleModeSelect = (value: string) => {
    if (value === 'cancel') {
      onComplete?.();
      return;
    }
    setIsFullBackup(value === 'full');
    setStatus('pending');
  };

  const runBackup = useCallback(async () => {
    try {
      setStatus('backing');

      // 创建备份目录
      fs.mkdirSync(BACKUP_DIR, { recursive: true });

      // 生成时间戳
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '-');
      const backupName = `backup-${timestamp}`;
      const tempDir = path.join(BACKUP_DIR, `.tmp-${backupName}`);
      const backupFilePath = path.join(BACKUP_DIR, `${backupName}.tar.gz`);

      // 清理并创建临时目录
      fs.rmSync(tempDir, { recursive: true, force: true });
      fs.mkdirSync(tempDir, { recursive: true });

      const backupResults: BackupResult[] = [];

      // 过滤要备份的项目
      const itemsToBackup = backupItems.filter((item) => item.required || isFullBackup);

      // 执行备份
      for (const item of itemsToBackup) {
        const srcPath = path.join(PROJECT_ROOT, item.src);
        const destPath = path.join(tempDir, item.dest);

        if (fs.existsSync(srcPath)) {
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          fs.cpSync(srcPath, destPath, { recursive: true });
          backupResults.push({ item, success: true, skipped: false });
        } else {
          backupResults.push({ item, success: false, skipped: true });
        }
        setResults([...backupResults]);
      }

      // 生成 manifest.json
      const manifest = {
        name: 'astro-koharu-backup',
        version: getVersion(),
        type: isFullBackup ? 'full' : 'basic',
        timestamp,
        created_at: now.toISOString(),
        files: Object.fromEntries(backupResults.map((r) => [r.item.dest, r.success])),
      };
      fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

      // 创建压缩包
      setStatus('compressing');
      execSync(`tar -czf "${backupFilePath}" -C "${tempDir}" .`, { cwd: PROJECT_ROOT });

      // 清理临时目录
      fs.rmSync(tempDir, { recursive: true, force: true });

      // 获取文件大小
      const stats = fs.statSync(backupFilePath);
      setFileSize(formatSize(stats.size));
      setBackupFile(backupFilePath);
      setStatus('done');

      // 如果不显示返回提示，直接退出
      if (!showReturnHint) {
        setTimeout(() => onComplete?.(), 100);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
      if (!showReturnHint) {
        setTimeout(() => onComplete?.(), 100);
      }
    }
  }, [isFullBackup, showReturnHint, onComplete]);

  useEffect(() => {
    if (status === 'pending') {
      runBackup();
    }
  }, [status, runBackup]);

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
