/**
 * Summary Panel Component
 *
 * 显示文章摘要面板，支持打字机动画展示
 * 可展示手写描述、AI 生成摘要或自动提取的内容
 * 支持 prefers-reduced-motion 可访问性
 */

import { ErrorBoundary, InlineErrorFallback } from '@components/common';
import { usePrefersReducedMotion } from '@hooks/index';
import { cn } from '@lib/utils';
import { memo, type ReactNode, type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { RiBook2Fill } from 'react-icons/ri';
import { MingcuteAiFillSvg } from '../svg/MingcuteAiFillSvg.tsx';

export type SummarySource = 'description' | 'ai' | 'auto';

const SummaryPanelContent = memo(
  ({
    isExpanded,
    summary,
    isTyping,
    textRef,
  }: {
    isExpanded: boolean;
    summary: string;
    isTyping: boolean;
    textRef: RefObject<HTMLSpanElement | null>;
  }) => {
    return (
      <div
        id="summary-panel-content"
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="rounded-b-lg bg-foreground/5 px-4 py-4 text-muted-foreground text-sm leading-relaxed">
            {/* 屏幕阅读器专用 */}
            <span className="sr-only">{summary}</span>

            {/* 视觉展示 - 通过 ref 直接更新 DOM，避免频繁重渲染 */}
            <p aria-hidden="true">
              <span ref={textRef} />
              {isTyping && <span className="typewriter-cursor" />}
            </p>
          </div>
        </div>
      </div>
    );
  },
);

export interface SummaryPanelProps {
  /** 摘要文本 */
  summary: string;
  /** 摘要来源类型 */
  source?: SummarySource;
  /** 打字机每个字符的间隔时间（毫秒），默认 25 */
  typingSpeed?: number;
  /** 自定义类名 */
  className?: string;
}

const SOURCE_CONFIG: Record<SummarySource, { label: string; icon: ReactNode }> = {
  description: {
    label: '人工摘要',
    icon: <RiBook2Fill className="size-4 text-primary" />,
  },
  ai: {
    label: 'AI 摘要',
    icon: <MingcuteAiFillSvg className="size-4 text-primary" />,
  },
  auto: {
    label: '摘要',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="size-4 text-primary"
        aria-hidden="true"
      >
        <path d="M20 22H4C3.44772 22 3 21.5523 3 21V3C3 2.44772 3.44772 2 4 2H20C20.5523 2 21 2.44772 21 3V21C21 21.5523 20.5523 22 20 22ZM19 20V4H5V20H19ZM7 6H11V10H7V6ZM7 12H17V14H7V12ZM7 16H17V18H7V16ZM13 7H17V9H13V7Z" />
      </svg>
    ),
  },
};

function SummaryPanel({ summary, source = 'ai', typingSpeed = 25, className }: SummaryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const textRef = useRef<HTMLSpanElement | null>(null);

  const config = SOURCE_CONFIG[source];

  // 检测用户是否偏好减少动画 (响应式，用户切换系统偏好后会自动更新)
  const prefersReducedMotion = usePrefersReducedMotion();

  // 清理动画
  const clearAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // 使用 requestAnimationFrame 的打字机效果 - 直接操作 DOM
  const startTyping = useCallback(() => {
    if (!textRef.current) return;

    // 如果用户偏好减少动画，或已经播放过动画，直接显示全部
    if (prefersReducedMotion || hasAnimated) {
      textRef.current.textContent = summary;
      setIsTyping(false);
      setHasAnimated(true);
      return;
    }

    setIsTyping(true);
    textRef.current.textContent = '';
    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const charIndex = Math.floor(elapsed / typingSpeed);

      if (charIndex < summary.length && textRef.current) {
        textRef.current.textContent = summary.slice(0, charIndex + 1);
        animationRef.current = requestAnimationFrame(animate);
      } else {
        if (textRef.current) {
          textRef.current.textContent = summary;
        }
        setIsTyping(false);
        setHasAnimated(true);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [summary, typingSpeed, prefersReducedMotion, hasAnimated]);

  // 展开/收起
  const handleToggle = useCallback(() => {
    if (isExpanded) {
      clearAnimation();
      setIsExpanded(false);
      setIsTyping(false);
    } else {
      setIsExpanded(true);
      startTyping();
    }
  }, [isExpanded, clearAnimation, startTyping]);

  // 组件卸载时清理
  useEffect(() => {
    return () => clearAnimation();
  }, [clearAnimation]);

  return (
    <ErrorBoundary FallbackComponent={InlineErrorFallback}>
      <div className={cn('overflow-hidden rounded-lg', className)}>
        {/* 触发按钮 */}
        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            'flex w-full cursor-pointer items-center justify-between bg-foreground/5 px-4 py-3 transition-all duration-250',
            'hover:bg-foreground/10',
            isExpanded && 'rounded-t-lg bg-foreground/10',
            !isExpanded && 'rounded-lg',
          )}
          aria-expanded={isExpanded}
          aria-controls="summary-panel-content"
        >
          <div className="flex items-center gap-1.5 font-medium text-muted-foreground text-sm">
            <span className={cn('transition-transform duration-300', isExpanded && source === 'ai' && 'rotate-10')}>
              {config.icon}
            </span>
            {config.label}
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={cn('size-4 text-muted-foreground transition-transform duration-300', isExpanded && 'rotate-180')}
            aria-hidden="true"
          >
            <path d="M12 16L6 10H18L12 16Z" />
          </svg>
        </button>
        <SummaryPanelContent isExpanded={isExpanded} summary={summary} isTyping={isTyping} textRef={textRef} />
      </div>
    </ErrorBoundary>
  );
}

export default SummaryPanel;
