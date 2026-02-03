import path from 'node:path';
import { ConfirmInput, Spinner } from '@inkjs/ui';
import { Box, Text } from 'ink';
import { useCallback, useEffect, useReducer, useState } from 'react';
import { CycleSelect as Select } from './components';
import { AUTO_EXIT_DELAY } from './constants';
import type { ReleaseInfo, UpdateOptions } from './constants/update';
import { usePressAnyKey, useRetimer } from './hooks';
import { runBackup } from './utils/backup-operations';
import { statusEffects } from './utils/update-effects';
import { abortMerge, abortRebase, buildReleaseUrl, extractReleaseSummary, fetchReleaseInfo } from './utils/update-operations';
import { createInitialState, updateReducer } from './utils/update-reducer';

interface UpdateAppProps {
  checkOnly?: boolean;
  skipBackup?: boolean;
  force?: boolean;
  targetTag?: string;
  rebase?: boolean;
  dryRun?: boolean;
  showReturnHint?: boolean;
  onComplete?: () => void;
}

export function UpdateApp({
  checkOnly = false,
  skipBackup = false,
  force = false,
  targetTag,
  rebase = false,
  dryRun = false,
  showReturnHint = false,
  onComplete,
}: UpdateAppProps) {
  const options: UpdateOptions = { checkOnly, skipBackup, force, targetTag, rebase, dryRun };
  const [state, dispatch] = useReducer(updateReducer, options, createInitialState);

  // Release 信息异步加载
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  const [releaseLoading, setReleaseLoading] = useState(false);

  const { status, gitStatus, updateInfo, mergeResult, backupFile, error, branchWarning, options: stateOptions } = state;
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

  // checkOnly 或 dryRun 模式在 preview 状态完成
  useEffect(() => {
    if (status === 'preview' && (stateOptions.checkOnly || stateOptions.dryRun)) {
      handleComplete();
    }
  }, [status, stateOptions.checkOnly, stateOptions.dryRun, handleComplete]);

  // 在 preview 状态异步加载 Release 信息
  useEffect(() => {
    if (status === 'preview' && updateInfo?.latestVersion && updateInfo.latestVersion !== 'unknown') {
      setReleaseLoading(true);
      fetchReleaseInfo(updateInfo.latestVersion)
        .then((info) => {
          setReleaseInfo(info);
        })
        .catch(() => {
          // 静默失败
        })
        .finally(() => {
          setReleaseLoading(false);
        });
    }
  }, [status, updateInfo?.latestVersion]);

  // 核心：单一 effect 处理所有副作用
  useEffect(() => {
    const effect = statusEffects[status];
    if (!effect) return;
    return effect(state, dispatch);
  }, [status, state]);

  // Force 模式自动确认（checkOnly 和 dryRun 模式除外）
  useEffect(() => {
    if (status === 'preview' && stateOptions.force && !stateOptions.checkOnly && !stateOptions.dryRun) {
      dispatch({ type: 'UPDATE_CONFIRM' });
    }
  }, [status, stateOptions.force, stateOptions.checkOnly, stateOptions.dryRun]);

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
  const handleBackupSelect = useCallback(
    (value: string) => {
      if (value === 'backup') handleBackupConfirm();
      else if (value === 'skip') handleBackupSkip();
      else handleUpdateCancel();
    },
    [handleBackupConfirm, handleBackupSkip, handleUpdateCancel],
  );

  const handleAbortMerge = useCallback(() => {
    const success = abortMerge();
    if (success) {
      onComplete?.();
    } else {
      dispatch({ type: 'ERROR', error: '无法中止合并，请手动执行 git merge --abort' });
    }
  }, [onComplete]);

  const handleAbortRebase = useCallback(() => {
    const success = abortRebase();
    if (success) {
      onComplete?.();
    } else {
      dispatch({ type: 'ERROR', error: '无法中止 rebase，请手动执行 git rebase --abort' });
    }
  }, [onComplete]);

  // 按任意键返回菜单
  usePressAnyKey(
    (status === 'done' ||
      status === 'error' ||
      status === 'up-to-date' ||
      status === 'dirty-warning' ||
      (status === 'preview' && (stateOptions.checkOnly || stateOptions.dryRun))) &&
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
          {stateOptions.rebase ? (
            // Rebase 模式：强制备份，只能确认或取消整个流程
            <>
              <Box marginBottom={1} flexDirection="column">
                <Text color="yellow" bold>
                  ⚠ Rebase 模式强制要求备份
                </Text>
                {stateOptions.skipBackup && (
                  <Text color="yellow" dimColor>
                    {'  '}（--skip-backup 已被忽略）
                  </Text>
                )}
              </Box>
              <Text>确认执行备份？</Text>
              <Box marginTop={1}>
                <ConfirmInput onConfirm={handleBackupConfirm} onCancel={handleUpdateCancel} />
              </Box>
            </>
          ) : (
            // 普通模式：三选项 - 备份/跳过/取消
            <>
              <Text>更新前是否备份当前内容？</Text>
              <Text dimColor>备份将保存博客文章、配置等重要文件，更新失败时可恢复</Text>
              <Box marginTop={1}>
                <Select
                  options={[
                    { label: '是 - 执行备份后更新', value: 'backup' },
                    { label: '否 - 跳过备份直接更新', value: 'skip' },
                    { label: '取消 - 退出更新流程', value: 'cancel' },
                  ]}
                  onChange={handleBackupSelect}
                />
              </Box>
              <Box marginTop={1}>
                <Text dimColor>提示: 使用 --skip-backup 跳过此提示</Text>
              </Box>
            </>
          )}
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
          {/* Rebase 模式警告 */}
          {stateOptions.rebase && (
            <Box marginBottom={1}>
              <Text color="red" bold>
                ⚠ REBASE 模式 - 历史将被重写！
              </Text>
            </Box>
          )}

          {backupFile && (
            <Box marginBottom={1}>
              <Text color="green">
                {'  '}+ 备份完成: {backupFile}
              </Text>
            </Box>
          )}

          {/* 降级警告 */}
          {updateInfo.isDowngrade && !stateOptions.rebase && (
            <Box marginBottom={1} flexDirection="column">
              <Text color="yellow" bold>
                ⚠ 这是一个降级操作，将回退到旧版本
              </Text>
              <Text color="yellow">{'  '}降级会覆盖所有主题文件，请确保已备份您的自定义内容</Text>
              {!backupFile && <Text color="red">{'  '}⚠ 您尚未执行备份！强烈建议先取消并执行备份</Text>}
            </Box>
          )}

          {/* 分支警告 */}
          {branchWarning && (
            <Box marginBottom={1}>
              <Text color="yellow">⚠ {branchWarning}</Text>
            </Box>
          )}

          {/* 版本信息 */}
          <Box marginBottom={1}>
            <Text bold>
              {updateInfo.isDowngrade ? (
                <>
                  回退到版本: <Text color="cyan">v{updateInfo.currentVersion}</Text> →{' '}
                  <Text color="yellow">v{updateInfo.latestVersion}</Text>
                </>
              ) : stateOptions.targetTag ? (
                <>
                  更新到指定版本: <Text color="cyan">v{updateInfo.currentVersion}</Text> →{' '}
                  <Text color="green">v{updateInfo.latestVersion}</Text>
                </>
              ) : (
                <>
                  发现新版本: <Text color="cyan">v{updateInfo.currentVersion}</Text> →{' '}
                  <Text color="green">v{updateInfo.latestVersion}</Text>
                </>
              )}
            </Text>
          </Box>

          {/* Release 信息 (仅升级时显示) */}
          {!updateInfo.isDowngrade && (
            <Box marginBottom={1} flexDirection="column">
              {releaseLoading ? (
                <Text dimColor>正在获取更新说明...</Text>
              ) : releaseInfo?.body ? (
                <>
                  <Text bold color="magenta">
                    更新内容:
                  </Text>
                  {extractReleaseSummary(releaseInfo.body).map((line, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static list from release summary
                    <Text key={index} dimColor>
                      {'  '}
                      {line}
                    </Text>
                  ))}
                </>
              ) : (
                <Text dimColor>（无法获取详细更新说明）</Text>
              )}
              {updateInfo.latestVersion !== 'unknown' && (
                <Box marginTop={1}>
                  <Text>
                    查看完整说明:{' '}
                    <Text color="blue" underline>
                      {buildReleaseUrl(updateInfo.latestVersion)}
                    </Text>
                  </Text>
                </Box>
              )}
            </Box>
          )}

          {/* Commit 列表 */}
          <Text bold>
            {updateInfo.isDowngrade ? `将移除 ${updateInfo.aheadCount} 个提交:` : `发现 ${updateInfo.behindCount} 个新提交:`}
          </Text>
          <Box marginTop={1} flexDirection="column">
            {updateInfo.commits.slice(0, 10).map((commit) => (
              <Text key={commit.hash}>
                <Text color={updateInfo.isDowngrade ? 'red' : 'yellow'}>
                  {'  '}
                  {updateInfo.isDowngrade ? '-' : '+'} {commit.hash}
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

          {/* 仅升级时显示本地领先提示 */}
          {!updateInfo.isDowngrade && updateInfo.aheadCount > 0 && (
            <Box marginTop={1}>
              <Text color="yellow">提示: 本地比上游模板多 {updateInfo.aheadCount} 个提交</Text>
            </Box>
          )}

          {stateOptions.checkOnly || stateOptions.dryRun ? (
            <Box marginTop={1} flexDirection="column">
              <Text dimColor>
                {stateOptions.dryRun
                  ? '这是 dry-run 模式，未执行实际操作'
                  : `这是检查模式，未执行${updateInfo.isDowngrade ? '回退' : '更新'}`}
              </Text>
              {stateOptions.dryRun && stateOptions.rebase && (
                <Box marginTop={1} flexDirection="column">
                  <Text>如果执行 rebase，将会:</Text>
                  <Text dimColor>{'  '}• 将本地提交重放到目标引用之上</Text>
                  <Text dimColor>{'  '}• 重写提交历史（commit hash 会改变）</Text>
                  <Text dimColor>{'  '}• 需要先执行备份</Text>
                  {updateInfo.localCommits.length > 0 && (
                    <Box marginTop={1} flexDirection="column">
                      <Text bold>将被重放的本地提交 ({updateInfo.localCommits.length} 个):</Text>
                      {updateInfo.localCommits.slice(0, 10).map((commit) => (
                        <Text key={commit.hash}>
                          <Text color="cyan">
                            {'  '}
                            {commit.hash}
                          </Text>
                          <Text> {commit.message}</Text>
                          <Text dimColor> ({commit.date})</Text>
                        </Text>
                      ))}
                      {updateInfo.localCommits.length > 10 && (
                        <Text dimColor>
                          {'  '}... 还有 {updateInfo.localCommits.length - 10} 个提交
                        </Text>
                      )}
                    </Box>
                  )}
                </Box>
              )}
              {updateInfo.isDowngrade && !stateOptions.dryRun && (
                <Box marginTop={1}>
                  <Text color="yellow">提示: 执行降级前请务必先备份您的博客内容</Text>
                  <Text dimColor>{'  '}pnpm koharu backup # 执行备份</Text>
                </Box>
              )}
              {showReturnHint && (
                <Box marginTop={1}>
                  <Text dimColor>按任意键返回主菜单...</Text>
                </Box>
              )}
            </Box>
          ) : (
            !stateOptions.force && (
              <Box marginTop={1} flexDirection="column">
                {updateInfo.isDowngrade && !backupFile && !stateOptions.rebase && (
                  <Box marginBottom={1}>
                    <Text color="red" bold>
                      ⚠ 警告: 未备份！降级后需要手动恢复您的博客内容
                    </Text>
                  </Box>
                )}
                <Box flexDirection="column">
                  <Text>
                    {stateOptions.rebase
                      ? `确认执行 rebase 到${stateOptions.targetTag ? `版本 v${updateInfo.latestVersion}` : '上游最新'}？（历史将被重写）`
                      : updateInfo.isDowngrade
                        ? `确认回退到版本 v${updateInfo.latestVersion}？`
                        : `确认更新到${stateOptions.targetTag ? `版本 v${updateInfo.latestVersion}` : '最新版本'}？`}
                  </Text>
                  {!stateOptions.rebase && !updateInfo.isDowngrade && (
                    <Text dimColor>{'  '}将使用 squash merge 保持提交历史线性</Text>
                  )}
                </Box>
                <ConfirmInput onConfirm={handleUpdateConfirm} onCancel={handleUpdateCancel} />
              </Box>
            )
          )}
        </Box>
      )}

      {/* Merging */}
      {status === 'merging' && (
        <Box>
          <Spinner
            label={
              stateOptions.rebase
                ? '正在执行 rebase...'
                : updateInfo?.isDowngrade
                  ? '正在回退版本...'
                  : '正在合并更新（squash merge）...'
            }
          />
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
            {stateOptions.rebase ? 'Rebase 完成' : updateInfo?.isDowngrade ? '版本回退完成' : '更新完成'}
          </Text>
          {updateInfo?.isDowngrade && !stateOptions.rebase && (
            <Text>
              已回退到版本: <Text color="cyan">v{updateInfo.latestVersion}</Text>
            </Text>
          )}
          {!updateInfo?.isDowngrade && !stateOptions.rebase && <Text dimColor>使用 squash merge 保持提交历史线性</Text>}
          {backupFile && (
            <Text>
              备份文件: <Text color="cyan">{backupFile}</Text>
            </Text>
          )}
          {/* Rebase 完成后的警告 */}
          {stateOptions.rebase && (
            <Box marginTop={1} flexDirection="column">
              <Text color="yellow" bold>
                ⚠ 您的提交历史已与上游同步
              </Text>
              <Text color="yellow">{'  '}如需恢复，请执行:</Text>
              <Text color="cyan">{'  '}pnpm koharu restore --latest</Text>
            </Box>
          )}
          {/* 升级时显示 Release 链接 */}
          {!updateInfo?.isDowngrade &&
            !stateOptions.rebase &&
            updateInfo?.latestVersion &&
            updateInfo.latestVersion !== 'unknown' && (
              <Box marginTop={1}>
                <Text>
                  查看更新内容:{' '}
                  <Text color="blue" underline>
                    {buildReleaseUrl(updateInfo.latestVersion)}
                  </Text>
                </Text>
              </Box>
            )}
          {/* 降级后的恢复提示 */}
          {updateInfo?.isDowngrade && !stateOptions.rebase && (
            <Box marginTop={1} flexDirection="column">
              <Text color="yellow" bold>
                ⚠ 重要: 请立即恢复您的博客内容！
              </Text>
              {backupFile ? (
                <>
                  <Text>{'  '}执行以下命令恢复备份:</Text>
                  <Text color="cyan">{'  '}pnpm koharu restore --latest</Text>
                </>
              ) : (
                <Text color="red">{'  '}您未执行备份，请手动恢复 src/content/blog 和 config/site.yaml</Text>
              )}
            </Box>
          )}
          <Box marginTop={1} flexDirection="column">
            <Text dimColor>后续步骤:</Text>
            {(updateInfo?.isDowngrade || stateOptions.rebase) && backupFile && (
              <Text dimColor>{'  '}pnpm koharu restore --latest # 恢复备份</Text>
            )}
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
            {stateOptions.targetTag ? '已是该版本' : '已是最新版本'}
          </Text>
          <Text>
            当前版本: <Text color="cyan">v{updateInfo?.currentVersion}</Text>
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
            {mergeResult.isRebaseConflict ? '发现 Rebase 冲突' : '发现合并冲突'}
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
            {mergeResult.isRebaseConflict ? (
              <>
                <Text dimColor>{'  '}1. 手动解决冲突后运行: git add . && git rebase --continue</Text>
                <Text dimColor>{'  '}2. 中止 rebase 恢复到更新前状态</Text>
              </>
            ) : (
              <>
                <Text dimColor>{'  '}1. 手动解决冲突后运行: git add . && git commit</Text>
                <Text dimColor>{'  '}2. 中止合并恢复到更新前状态</Text>
              </>
            )}
          </Box>
          {backupFile && (
            <Box marginTop={1}>
              <Text>
                备份文件: <Text color="cyan">{backupFile}</Text>
              </Text>
            </Box>
          )}
          <Box marginTop={1} flexDirection="column">
            <Text>{mergeResult.isRebaseConflict ? '是否中止 rebase？' : '是否中止合并？'}</Text>
            <ConfirmInput
              onConfirm={mergeResult.isRebaseConflict ? handleAbortRebase : handleAbortMerge}
              onCancel={() => onComplete?.()}
            />
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
