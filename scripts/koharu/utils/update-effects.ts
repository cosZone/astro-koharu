import path from 'node:path';
import type { Dispatch } from 'react';
import { BACKUP_DIR } from '../constants/paths';
import { UPSTREAM_URL, type UpdateAction, type UpdateState, type UpdateStatus } from '../constants/update';
import {
  checkGitStatus,
  cleanRestore,
  ensureUpstreamRemote,
  fetchUpstream,
  getUpdateInfo,
  hasUpstreamMergeHistory,
  hasUpstreamTrackingRef,
  installDeps,
  listRecentTags,
  mergeUpstream,
  tagExists,
} from './update-operations';

/** Effect 函数类型：接收当前状态和 dispatch，可返回 cleanup 函数 */
type EffectFn = (state: UpdateState, dispatch: Dispatch<UpdateAction>) => (() => void) | undefined;

/**
 * 状态副作用映射表
 * 每个需要执行副作用的状态对应一个 effect 函数
 */
export const statusEffects: Partial<Record<UpdateStatus, EffectFn>> = {
  checking: (state, dispatch) => {
    try {
      // --clean 和 --rebase 互斥
      if (state.options.clean && state.options.rebase) {
        dispatch({ type: 'ERROR', error: '--clean 和 --rebase 不能同时使用' });
        return undefined;
      }

      const gitStatus = checkGitStatus();
      const { checkOnly } = state.options;

      // 确保 upstream remote 存在
      const upstream = ensureUpstreamRemote({ allowAdd: !checkOnly });
      if (!upstream.success) {
        if (upstream.reason === 'mismatch') {
          const currentUrl = upstream.currentUrl ?? 'unknown';
          dispatch({
            type: 'ERROR',
            error: `upstream 已存在但指向 ${currentUrl}，请手动调整为 ${UPSTREAM_URL}`,
          });
          return undefined;
        }
        if (upstream.reason === 'missing' && checkOnly) {
          dispatch({
            type: 'ERROR',
            error: '检查模式不会修改仓库，请先手动添加 upstream 或使用非 --check 模式',
          });
          return undefined;
        }
        dispatch({ type: 'ERROR', error: '无法添加 upstream remote' });
        return undefined;
      }

      dispatch({ type: 'GIT_CHECKED', payload: gitStatus });
    } catch (err) {
      dispatch({ type: 'ERROR', error: err instanceof Error ? err.message : String(err) });
    }
    return undefined;
  },

  fetching: (state, dispatch) => {
    try {
      if (state.options.checkOnly) {
        if (!hasUpstreamTrackingRef()) {
          dispatch({
            type: 'ERROR',
            error: '检查模式不会执行 git fetch，请先手动执行 git fetch upstream',
          });
          return undefined;
        }
      } else {
        const success = fetchUpstream();
        if (!success) {
          dispatch({ type: 'ERROR', error: '无法获取 upstream 更新，请检查网络连接' });
          return undefined;
        }
      }

      // 如果指定了 targetTag，验证其存在性
      if (state.options.targetTag && !tagExists(state.options.targetTag)) {
        const recentTags = listRecentTags(5);
        const tagsHint = recentTags.length > 0 ? `\n可用的版本: ${recentTags.join(', ')}` : '';
        dispatch({
          type: 'ERROR',
          error: `Tag "${state.options.targetTag}" 不存在${tagsHint}`,
        });
        return undefined;
      }

      const info = getUpdateInfo(state.options.targetTag);

      // 检测是否需要首次迁移提示（rebase/clean 模式不需要）
      const needsMigration = !state.options.clean && !state.options.rebase && !hasUpstreamMergeHistory();

      dispatch({ type: 'FETCHED', payload: info, needsMigration });
    } catch (err) {
      dispatch({ type: 'ERROR', error: err instanceof Error ? err.message : String(err) });
    }
    return undefined;
  },

  merging: (state, dispatch) => {
    let cancelled = false;

    // 延迟到微任务让 Ink 先渲染一帧 Spinner（execSync 仍会阻塞后续帧）
    Promise.resolve()
      .then(() => {
        if (cancelled) return;
        const result = mergeUpstream({
          targetTag: state.options.targetTag,
          isDowngrade: state.updateInfo?.isDowngrade,
          rebase: state.options.rebase,
          clean: state.options.clean,
        });
        dispatch({ type: 'MERGED', payload: result });
      })
      .catch((err) => {
        if (cancelled) return;
        dispatch({ type: 'ERROR', error: err instanceof Error ? err.message : String(err) });
      });

    return () => {
      cancelled = true;
    };
  },

  'clean-restoring': (state, dispatch) => {
    let cancelled = false;

    // 延迟到微任务让 Ink 先渲染一帧 Spinner（execSync 仍会阻塞后续帧）
    Promise.resolve()
      .then(() => {
        if (cancelled) return;
        if (!state.backupFile) {
          dispatch({ type: 'ERROR', error: 'Clean 模式需要备份文件，但未找到备份' });
          return;
        }
        // backupFile 存储的是 basename，需要构造完整路径
        const fullPath = path.join(BACKUP_DIR, state.backupFile);
        const restoredFiles = cleanRestore(fullPath, state.mergeResult?.preCleanSha);
        dispatch({ type: 'CLEAN_RESTORED', restoredFiles });
      })
      .catch((err) => {
        if (cancelled) return;
        dispatch({ type: 'ERROR', error: `还原用户内容失败: ${err instanceof Error ? err.message : String(err)}` });
      });

    return () => {
      cancelled = true;
    };
  },

  installing: (_state, dispatch) => {
    let cancelled = false;

    installDeps()
      .then((result) => {
        if (cancelled) return;
        if (!result.success) {
          dispatch({ type: 'ERROR', error: `依赖安装失败: ${result.error}` });
          return;
        }
        dispatch({ type: 'INSTALLED' });
      })
      .catch((err) => {
        if (cancelled) return;
        dispatch({ type: 'ERROR', error: err instanceof Error ? err.message : String(err) });
      });

    // 返回 cleanup 函数，防止组件卸载后更新状态
    return () => {
      cancelled = true;
    };
  },
};
