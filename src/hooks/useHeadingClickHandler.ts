/**
 * useHeadingClickHandler Hook
 *
 * 处理 TOC 中标题点击的可复用 hook。
 * 滚动到对应标题并管理手风琴展开状态。
 *
 * @example
 * ```tsx
 * function TableOfContents() {
 *   const headings = useHeadingTree();
 *   const { expandedIds, setExpandedIds } = useExpandedState({ headings, activeId });
 *
 *   const handleHeadingClick = useHeadingClickHandler({
 *     headings,
 *     setExpandedIds,
 *   });
 *
 *   return <HeadingList onHeadingClick={handleHeadingClick} />;
 * }
 * ```
 */

import { useCallback } from 'react';
import { findHeadingById, getParentIds, getSiblingIds, type Heading } from './useHeadingTree';

export interface UseHeadingClickHandlerOptions {
  /** 层级化的标题树 */
  headings: Heading[];
  /** 展开状态的 setter */
  setExpandedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

/**
 * 处理标题点击，滚动到对应位置并更新手风琴展开状态
 *
 * @param options - 配置选项
 * @returns 标题点击处理函数
 */
export function useHeadingClickHandler({ headings, setExpandedIds }: UseHeadingClickHandlerOptions): (id: string) => void {
  return useCallback(
    (id: string) => {
      const element = document.getElementById(id);
      if (!element) return;

      element.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // 获取点击的标题节点
      const clickedHeading = findHeadingById(headings, id);
      if (!clickedHeading) return;

      // 收集需要展开的父级 ID
      const parentIds = getParentIds(clickedHeading);
      // 如果点击的标题本身有子节点，也将其加入展开列表
      if (clickedHeading.children.length > 0) {
        parentIds.unshift(id);
      }

      if (parentIds.length === 0) return;

      setExpandedIds((prev) => {
        const newSet = new Set(prev);

        // 按层级分组父节点，实现手风琴效果
        const parentsByLevel: { [level: number]: string[] } = {};

        parentIds.forEach((parentId) => {
          const parentHeading = findHeadingById(headings, parentId);
          if (parentHeading) {
            if (!parentsByLevel[parentHeading.level]) {
              parentsByLevel[parentHeading.level] = [];
            }
            parentsByLevel[parentHeading.level].push(parentId);
          }
        });

        // 对每个层级，关闭同级兄弟节点，展开当前路径上的节点
        Object.keys(parentsByLevel).forEach((levelStr) => {
          const level = parseInt(levelStr, 10);
          const parentsAtLevel = parentsByLevel[level];

          parentsAtLevel.forEach((parentId) => {
            const parentHeading = findHeadingById(headings, parentId);
            if (parentHeading) {
              // 关闭同级兄弟节点
              const siblingIds = getSiblingIds(parentHeading, headings);
              siblingIds.forEach((siblingId) => {
                newSet.delete(siblingId);
              });

              // 展开当前节点
              newSet.add(parentId);
            }
          });
        });

        return newSet;
      });
    },
    [headings, setExpandedIds],
  );
}
