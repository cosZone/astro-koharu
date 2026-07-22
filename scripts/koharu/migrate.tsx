import { ConfirmInput, Spinner } from '@inkjs/ui';
import { Box, Text } from 'ink';
import { useCallback, useEffect, useState } from 'react';

import { AUTO_EXIT_DELAY } from './constants';
import { usePressAnyKey, useRetimer } from './hooks';
import { runBackup } from './utils/backup-operations';
import { applyContentMigration, type ContentMigrationPlan, planContentMigration } from './utils/migration-operations';

type MigrationStatus = 'confirming' | 'backing-up' | 'migrating' | 'done' | 'error' | 'cancelled';

interface MigrateAppProps {
  check?: boolean;
  dryRun?: boolean;
  force?: boolean;
  showReturnHint?: boolean;
  onComplete?: () => void;
}

const ACTION_LABELS = {
  'add-link': '补充 link',
  'rename-slug': 'slug 改为 link',
  'remove-slug': '移除冗余 slug',
} as const;

export function MigrateApp({
  check = false,
  dryRun = false,
  force = false,
  showReturnHint = false,
  onComplete,
}: MigrateAppProps) {
  const [plan, setPlan] = useState<ContentMigrationPlan>(() => planContentMigration());
  const [status, setStatus] = useState<MigrationStatus>(() =>
    check || dryRun || plan.changes.length === 0 || plan.errors.length > 0 ? 'done' : 'confirming',
  );
  const [backupFile, setBackupFile] = useState('');
  const [error, setError] = useState('');
  const retimer = useRetimer();

  const finishLater = useCallback(() => {
    if (!showReturnHint) retimer(setTimeout(() => onComplete?.(), AUTO_EXIT_DELAY));
  }, [onComplete, retimer, showReturnHint]);

  const runMigration = useCallback(() => {
    try {
      setStatus('backing-up');
      const backup = runBackup(false);
      setBackupFile(backup.backupFile);
      setStatus('migrating');
      const freshPlan = planContentMigration();
      setPlan(freshPlan);
      if (freshPlan.errors.length > 0) {
        const firstIssue = freshPlan.errors[0];
        throw new Error(
          `备份后重新扫描发现 ${freshPlan.errors.length} 个问题，未修改文件。${firstIssue.file}: ${firstIssue.message}`,
        );
      }
      applyContentMigration(freshPlan);
      setStatus('done');
    } catch (migrationError) {
      setError(migrationError instanceof Error ? migrationError.message : String(migrationError));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (status === 'done' || status === 'error' || status === 'cancelled') finishLater();
  }, [finishLater, status]);

  // In non-interactive CLI runs, surface failures through the exit code so scripts and CI can detect them.
  // Check mode also fails when safe migrations are pending. The interactive menu never fails the process.
  useEffect(() => {
    if (showReturnHint) return;
    if (status === 'error' || (status === 'done' && (plan.errors.length > 0 || (check && plan.changes.length > 0)))) {
      process.exitCode = 1;
    }
  }, [check, plan.changes.length, plan.errors.length, showReturnHint, status]);

  useEffect(() => {
    if (force && status === 'confirming') runMigration();
  }, [force, runMigration, status]);

  const handleCancel = useCallback(() => {
    setStatus('cancelled');
  }, []);

  usePressAnyKey((status === 'done' || status === 'error' || status === 'cancelled') && showReturnHint, () => {
    onComplete?.();
  });

  return (
    <Box flexDirection="column">
      {(status === 'confirming' || status === 'done') && (
        <Box flexDirection="column">
          <Text bold>内容迁移检查</Text>
          <Text>
            已扫描 <Text color="cyan">{plan.scannedFiles}</Text> 篇文章，需迁移{' '}
            <Text color={plan.changes.length > 0 ? 'yellow' : 'green'}>{plan.changes.length}</Text> 篇
          </Text>
          {plan.changes.slice(0, 10).map((change) => (
            <Text key={change.file} dimColor>
              {'  '}- {change.file} ({ACTION_LABELS[change.action]})
            </Text>
          ))}
          {plan.changes.length > 10 && (
            <Text dimColor>
              {'  '}... 还有 {plan.changes.length - 10} 篇
            </Text>
          )}

          {plan.errors.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text color="red" bold>
                发现 {plan.errors.length} 个问题，未修改文件
              </Text>
              {plan.errors.slice(0, 5).map((issue) => (
                <Text key={`${issue.file}:${issue.message}`} color="red">
                  {'  '}- {issue.file}: {issue.message}
                </Text>
              ))}
            </Box>
          )}

          {status === 'confirming' && (
            <Box flexDirection="column" marginTop={1}>
              <Text>迁移前会自动创建基础备份。确认执行？</Text>
              {!force && <ConfirmInput onConfirm={runMigration} onCancel={handleCancel} />}
            </Box>
          )}

          {status === 'done' && plan.errors.length === 0 && !check && (
            <Box flexDirection="column" marginTop={1}>
              <Text bold color="green">
                {dryRun ? '预览完成，未修改文件' : plan.changes.length === 0 ? '无需迁移' : '迁移完成'}
              </Text>
              {backupFile && <Text dimColor>备份文件: {backupFile}</Text>}
            </Box>
          )}

          {status === 'done' && check && (
            <Box flexDirection="column" marginTop={1}>
              {plan.errors.length === 0 && plan.changes.length === 0 ? (
                <Text bold color="green">
                  内容迁移检查通过
                </Text>
              ) : (
                <>
                  <Text bold color="red">
                    内容尚未完成迁移，已阻止启动或构建
                  </Text>
                  <Text color="yellow">{'  '}先预览: pnpm koharu migrate --dry-run</Text>
                  <Text color="yellow">{'  '}再执行: pnpm koharu migrate</Text>
                </>
              )}
            </Box>
          )}
        </Box>
      )}

      {status === 'backing-up' && <Spinner label="正在备份用户内容..." />}
      {status === 'migrating' && <Spinner label="正在迁移文章链接..." />}

      {status === 'cancelled' && <Text color="yellow">已取消</Text>}
      {status === 'error' && (
        <Box flexDirection="column">
          <Text bold color="red">
            迁移失败
          </Text>
          <Text color="red">{error}</Text>
          {backupFile && <Text dimColor>可从备份恢复: {backupFile}</Text>}
        </Box>
      )}

      {(status === 'done' || status === 'error' || status === 'cancelled') && showReturnHint && (
        <Box marginTop={1}>
          <Text dimColor>按任意键返回主菜单...</Text>
        </Box>
      )}
    </Box>
  );
}
