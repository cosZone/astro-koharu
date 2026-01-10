import path from 'node:path';
import { ConfirmInput, Spinner } from '@inkjs/ui';
import { Box, Text } from 'ink';
import { useCallback, useEffect, useReducer } from 'react';
import { AUTO_EXIT_DELAY } from './constants';
import type { UpdateOptions } from './constants/update';
import { usePressAnyKey, useRetimer } from './hooks';
import { runBackup } from './utils/backup-operations';
import { statusEffects } from './utils/update-effects';
import { abortMerge } from './utils/update-operations';
import { createInitialState, updateReducer } from './utils/update-reducer';

interface UpdateAppProps {
  checkOnly?: boolean;
  skipBackup?: boolean;
  force?: boolean;
  showReturnHint?: boolean;
  onComplete?: () => void;
}

export function UpdateApp({
  checkOnly = false,
  skipBackup = false,
  force = false,
  showReturnHint = false,
  onComplete,
}: UpdateAppProps) {
  const options: UpdateOptions = { checkOnly, skipBackup, force };
  const [state, dispatch] = useReducer(updateReducer, options, createInitialState);

  const { status, gitStatus, updateInfo, mergeResult, backupFile, error, options: stateOptions } = state;
  const retimer = useRetimer();

  // 统一完成处理
  const handleComplete = useCallback(() => {
    if (!showReturnHint) {
      retimer(setTimeout(() => onComplete?.(), AUTO_EXIT_DELAY));
    }
  }, [showReturnHint, onComplete, retimer]);

  // 终态自动完成
  useEffect(() => {
    if (status === 'up-to-date' || status === 'done' || status === 'error') {
      handleComplete();
    }
  }, [status, handleComplete]);

  // checkOnly 模式在 preview 状态完成
  useEffect(() => {
    if (status === 'preview' && stateOptions.checkOnly) {
      handleComplete();
    }
  }, [status, stateOptions.checkOnly, handleComplete]);

  // 核心：单一 effect 处理所有副作用
  useEffect(() => {
    const effect = statusEffects[status];
    if (!effect) return;
    return effect(state, dispatch);
  }, [status, state]);

  // Force 模式自动确认
  useEffect(() => {
    if (status === 'preview' && stateOptions.force && !stateOptions.checkOnly) {
      dispatch({ type: 'UPDATE_CONFIRM' });
    }
  }, [status, stateOptions.force, stateOptions.checkOnly]);

  // 交互处理器
  const handleBackupConfirm = useCallback(() => {
    dispatch({ type: 'BACKUP_CONFIRM' });
    try {
      const result = runBackup(true);
      dispatch({ type: 'BACKUP_DONE', backupFile: path.basename(result.backupFile) });
    } catch (err) {
      dispatch({ type: 'ERROR', error: `备份失败: ${err instanceof Error ? err.message : String(err)}` });
    }
  }, []);

  const handleBackupSkip = useCallback(() => dispatch({ type: 'BACKUP_SKIP' }), []);
  const handleUpdateConfirm = useCallback(() => dispatch({ type: 'UPDATE_CONFIRM' }), []);
  const handleUpdateCancel = useCallback(() => onComplete?.(), [onComplete]);

  const handleAbortMerge = useCallback(() => {
    const success = abortMerge();
    if (success) {
      onComplete?.();
    } else {
      dispatch({ type: 'ERROR', error: '无法中止合并，请手动执行 git merge --abort' });
    }
  }, [onComplete]);

  // 按任意键返回菜单
  usePressAnyKey(
    (status === 'done' ||
      status === 'error' ||
      status === 'up-to-date' ||
      status === 'dirty-warning' ||
      (status === 'preview' && stateOptions.checkOnly)) &&
      showReturnHint,
    () => {
      onComplete?.();
    },
  );

  return (
    <Box flexDirection="column">
      {/* Checking status */}
      {status === 'checking' && (
        <Box>
          <Spinner label="正在检查 Git 状态..." />
        </Box>
      )}

      {/* Dirty warning */}
      {status === 'dirty-warning' && gitStatus && (
        <Box flexDirection="column">
          <Text color="yellow" bold>
            工作区有未提交的更改
          </Text>
          <Box marginTop={1} flexDirection="column">
            {gitStatus.uncommittedFiles.slice(0, 5).map((file) => (
              <Text key={file} dimColor>
                {'  '}- {file}
              </Text>
            ))}
            {gitStatus.uncommittedFiles.length > 5 && (
              <Text dimColor>
                {'  '}... 还有 {gitStatus.uncommittedFiles.length - 5} 个文件
              </Text>
            )}
          </Box>
          <Box marginTop={1}>
            <Text>请先提交或暂存你的更改:</Text>
          </Box>
          <Box marginTop={1} flexDirection="column">
            <Text dimColor>{'  '}git add . && git commit -m "save changes"</Text>
            <Text dimColor>{'  '}# 或者</Text>
            <Text dimColor>{'  '}git stash</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>提示: 使用 --force 可跳过此检查（不推荐）</Text>
          </Box>
          {showReturnHint && (
            <Box marginTop={1}>
              <Text dimColor>按任意键返回主菜单...</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Backup confirmation */}
      {status === 'backup-confirm' && (
        <Box flexDirection="column">
          <Text>更新前是否备份当前内容？</Text>
          <Box marginTop={1}>
            <ConfirmInput onConfirm={handleBackupConfirm} onCancel={handleBackupSkip} />
          </Box>
          <Box marginTop={1}>
            <Text dimColor>提示: 使用 --skip-backup 跳过此提示</Text>
          </Box>
        </Box>
      )}

      {/* Backing up */}
      {status === 'backing-up' && (
        <Box>
          <Spinner label="正在备份..." />
        </Box>
      )}

      {/* Fetching */}
      {status === 'fetching' && (
        <Box>
          <Spinner label="正在获取更新..." />
        </Box>
      )}

      {/* Preview */}
      {status === 'preview' && updateInfo && (
        <Box flexDirection="column">
          {backupFile && (
            <Box marginBottom={1}>
              <Text color="green">
                {'  '}+ 备份完成: {backupFile}
              </Text>
            </Box>
          )}

          <Text bold>发现 {updateInfo.behindCount} 个新提交:</Text>
          <Box marginTop={1} flexDirection="column">
            {updateInfo.commits.slice(0, 10).map((commit) => (
              <Text key={commit.hash}>
                <Text color="yellow">
                  {'  '}
                  {commit.hash}
                </Text>
                <Text> {commit.message}</Text>
                <Text dimColor> ({commit.date})</Text>
              </Text>
            ))}
            {updateInfo.commits.length > 10 && (
              <Text dimColor>
                {'  '}... 还有 {updateInfo.commits.length - 10} 个提交
              </Text>
            )}
          </Box>

          {updateInfo.aheadCount > 0 && (
            <Box marginTop={1}>
              <Text color="yellow">注意: 本地有 {updateInfo.aheadCount} 个未推送的提交</Text>
            </Box>
          )}

          {stateOptions.checkOnly ? (
            <Box marginTop={1}>
              <Text dimColor>这是检查模式，未执行更新</Text>
              {showReturnHint && (
                <Box marginTop={1}>
                  <Text dimColor>按任意键返回主菜单...</Text>
                </Box>
              )}
            </Box>
          ) : (
            !stateOptions.force && (
              <Box marginTop={1} flexDirection="column">
                <Text>确认更新到最新版本？</Text>
                <ConfirmInput onConfirm={handleUpdateConfirm} onCancel={handleUpdateCancel} />
              </Box>
            )
          )}
        </Box>
      )}

      {/* Merging */}
      {status === 'merging' && (
        <Box>
          <Spinner label="正在合并更新..." />
        </Box>
      )}

      {/* Installing */}
      {status === 'installing' && (
        <Box>
          <Spinner label="正在安装依赖..." />
        </Box>
      )}

      {/* Done */}
      {status === 'done' && (
        <Box flexDirection="column">
          <Text bold color="green">
            更新完成
          </Text>
          {backupFile && (
            <Text>
              备份文件: <Text color="cyan">{backupFile}</Text>
            </Text>
          )}
          <Box marginTop={1} flexDirection="column">
            <Text dimColor>后续步骤:</Text>
            <Text dimColor>{'  '}pnpm dev # 启动开发服务器测试</Text>
          </Box>
          {showReturnHint && (
            <Box marginTop={1}>
              <Text dimColor>按任意键返回主菜单...</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Up to date */}
      {status === 'up-to-date' && (
        <Box flexDirection="column">
          <Text bold color="green">
            已是最新版本
          </Text>
          <Text>
            当前版本: <Text color="cyan">{updateInfo?.currentVersion}</Text>
          </Text>
          {showReturnHint && (
            <Box marginTop={1}>
              <Text dimColor>按任意键返回主菜单...</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Conflict */}
      {status === 'conflict' && mergeResult && (
        <Box flexDirection="column">
          <Text bold color="yellow">
            发现合并冲突
          </Text>
          <Box marginTop={1} flexDirection="column">
            <Text>冲突文件:</Text>
            {mergeResult.conflictFiles.map((file) => (
              <Text key={file} color="red">
                {'  '}- {file}
              </Text>
            ))}
          </Box>
          <Box marginTop={1} flexDirection="column">
            <Text>你可以:</Text>
            <Text dimColor>{'  '}1. 手动解决冲突后运行: git add . && git commit</Text>
            <Text dimColor>{'  '}2. 中止合并恢复到更新前状态</Text>
          </Box>
          {backupFile && (
            <Box marginTop={1}>
              <Text>
                备份文件: <Text color="cyan">{backupFile}</Text>
              </Text>
            </Box>
          )}
          <Box marginTop={1} flexDirection="column">
            <Text>是否中止合并？</Text>
            <ConfirmInput onConfirm={handleAbortMerge} onCancel={() => onComplete?.()} />
          </Box>
        </Box>
      )}

      {/* Error */}
      {status === 'error' && (
        <Box flexDirection="column">
          <Text bold color="red">
            更新失败
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
