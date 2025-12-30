import { useIsMobile } from '@hooks/useMediaQuery';
import { useStore } from '@nanostores/react';
import { Canvas } from '@react-three/fiber';
import { christmasEnabled } from '@store/christmas';
import { throttle } from 'es-toolkit';
import { type MotionValue, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SnowParticles } from './SnowParticles';

interface SnowfallCanvasProps {
  speed?: number;
  intensity?: number;
  mobileIntensity?: number;
  /** 视差强度，鼠标移动时的偏移量 (0-1)，默认 0.15 */
  parallaxStrength?: number;
  /** z-index，默认 50 */
  zIndex?: number;
  /** 层位置：'background' 渲染前半层，'foreground' 渲染后半层，会自动根据 maxLayers 计算 layerRange */
  layerPosition?: 'background' | 'foreground';
  /** 桌面端最大层数 */
  maxLayers?: number;
  /** 桌面端每层最大迭代次数 */
  maxIterations?: number;
  /** 移动端最大层数 */
  mobileMaxLayers?: number;
  /** 移动端每层最大迭代次数 */
  mobileMaxIterations?: number;
}

export function SnowfallCanvas({
  speed = 1,
  intensity = 0.6,
  mobileIntensity = 0.4,
  parallaxStrength = 0.15,
  zIndex = 50,
  layerPosition = 'foreground',
  maxLayers: desktopMaxLayers = 4,
  maxIterations: desktopMaxIterations = 6,
  mobileMaxLayers = 2,
  mobileMaxIterations = 3,
}: SnowfallCanvasProps) {
  const isChristmasEnabled = useStore(christmasEnabled);
  const shouldReduceMotion = useReducedMotion();
  const isMobile = useIsMobile();

  // Tab visibility detection - pause rendering when tab is not visible
  const [isVisible, setIsVisible] = useState(true);
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // 鼠标位置 motion values (标准化到 -0.5 ~ 0.5)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // 使用 spring 平滑鼠标移动
  const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  // Throttled mouse move handler (~30fps)
  const throttledMouseMove = useMemo(
    () =>
      throttle((e: MouseEvent) => {
        const x = e.clientX / window.innerWidth - 0.5;
        const y = e.clientY / window.innerHeight - 0.5;
        mouseX.set(x);
        mouseY.set(y);
      }, 32),
    [mouseX, mouseY],
  );

  // 鼠标追踪 - 仅在桌面端启用
  useEffect(() => {
    // 移动端或减少动画时不需要鼠标视差
    if (isMobile || shouldReduceMotion) return;

    const handleMouseLeave = () => {
      // 鼠标离开窗口时缓慢回到中心
      mouseX.set(0);
      mouseY.set(0);
    };

    window.addEventListener('mousemove', throttledMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', throttledMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
    // mouseX/mouseY are stable refs from useMotionValue, no need in deps
  }, [
    isMobile,
    shouldReduceMotion,
    throttledMouseMove, // 鼠标离开窗口时缓慢回到中心
    mouseX.set,
    mouseY.set,
  ]);

  const finalIntensity = isMobile ? mobileIntensity : intensity;
  const finalParallaxStrength = isMobile ? 0 : parallaxStrength;

  // 性能优化：根据设备类型调整迭代次数（可在 site-config.ts 中配置）
  const maxLayers = isMobile ? mobileMaxLayers : desktopMaxLayers;
  const maxIterations = isMobile ? mobileMaxIterations : desktopMaxIterations;

  // 根据 layerPosition 和 maxLayers 自动计算 layerRange
  // 背景层渲染前半部分，前景层渲染后半部分
  const halfLayers = Math.floor(maxLayers / 2);
  const layerRange: [number, number] = layerPosition === 'background' ? [0, halfLayers - 1] : [halfLayers, maxLayers - 1];

  // 如果用户偏好减少动画、圣诞特效被关闭、或标签页不可见，不渲染雪花
  if (shouldReduceMotion || !isChristmasEnabled || !isVisible) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex,
      }}
    >
      <Canvas
        // 全屏着色器不需要透视相机，使用正交投影
        orthographic
        camera={{ zoom: 1, position: [0, 0, 1] }}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'low-power',
        }}
        // 性能优化：移动端用稍高 DPR 避免模糊，桌面端用低 DPR
        dpr={isMobile ? 1 : 0.7}
        style={{
          background: 'transparent',
          pointerEvents: 'none',
        }}
        eventSource={undefined}
        eventPrefix={undefined}
      >
        <SnowParticlesWithParallax
          speed={speed}
          intensity={finalIntensity}
          smoothMouseX={smoothMouseX}
          smoothMouseY={smoothMouseY}
          parallaxStrength={finalParallaxStrength}
          layerRange={layerRange}
          maxLayers={maxLayers}
          maxIterations={maxIterations}
        />
      </Canvas>
    </div>
  );
}

/** 内部组件：桥接 Motion spring 值和 R3F useFrame */
function SnowParticlesWithParallax({
  speed,
  intensity,
  smoothMouseX,
  smoothMouseY,
  parallaxStrength,
  layerRange,
  maxLayers,
  maxIterations,
}: {
  speed: number;
  intensity: number;
  smoothMouseX: MotionValue<number>;
  smoothMouseY: MotionValue<number>;
  parallaxStrength: number;
  layerRange: [number, number];
  maxLayers: number;
  maxIterations: number;
}) {
  const parallaxRef = useRef({ x: 0, y: 0 });

  // 订阅 spring 值的变化，存到 ref 中供 useFrame 使用
  useEffect(() => {
    const unsubX = smoothMouseX.on('change', (v) => {
      parallaxRef.current.x = v * parallaxStrength;
    });
    const unsubY = smoothMouseY.on('change', (v) => {
      parallaxRef.current.y = v * parallaxStrength;
    });
    return () => {
      unsubX();
      unsubY();
    };
  }, [smoothMouseX, smoothMouseY, parallaxStrength]);

  return (
    <SnowParticles
      speed={speed}
      intensity={intensity}
      parallaxRef={parallaxRef}
      layerRange={layerRange}
      maxLayers={maxLayers}
      maxIterations={maxIterations}
    />
  );
}
