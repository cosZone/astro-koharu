import type { Dispatch } from 'react';
import { UPSTREAM_URL, type UpdateAction, type UpdateState, type UpdateStatus } from '../constants/update';
import {
  checkGitStatus,
  ensureUpstreamRemote,
  fetchUpstream,
  getUpdateInfo,
  hasUpstreamTrackingRef,
  installDeps,
  mergeUpstream,
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
      const info = getUpdateInfo();
      dispatch({ type: 'FETCHED', payload: info });
    } catch (err) {
      dispatch({ type: 'ERROR', error: err instanceof Error ? err.message : String(err) });
    }
    return undefined;
  },

  merging: (_state, dispatch) => {
    const result = mergeUpstream();
    dispatch({ type: 'MERGED', payload: result });
    return undefined;
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
