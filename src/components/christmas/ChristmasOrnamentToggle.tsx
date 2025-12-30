import { cn } from '@lib/utils';
import { useStore } from '@nanostores/react';
import { christmasEnabled, disableChristmas, ornamentHidden, toggleChristmas } from '@store/christmas';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { useEffect, useState } from 'react';

/** Minimum drag distance to trigger toggle action */
const TOGGLE_TRIGGER_DISTANCE = 40;
/** Maximum drag distance constraint */
const MAX_DRAG_DISTANCE = 110;
const ORNAMENT_SIZE = 72;
const STRING_HEIGHT = 80;

function TopDecoration() {
  return (
    <div className="pointer-events-none absolute top-10 left-1/2 z-100 -translate-x-1/2 -translate-y-[15%] cursor-none drop-shadow">
      <svg width="60" height="50" viewBox="0 0 60 50" className="overflow-visible" aria-hidden="true">
        <defs>
          <radialGradient id="bow-red-grad" cx="30%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#ff5252" />
            <stop offset="60%" stopColor="#d32f2f" />
            <stop offset="100%" stopColor="#8c1c1c" />
          </radialGradient>
        </defs>

        {/* Ribbon Tails */}
        <g transform="translate(30, 20)">
          <path d="M-5 0 L-15 25 L-10 28 L0 5 Z" fill="#b71c1c" />
          <path d="M5 0 L15 25 L10 28 L0 5 Z" fill="#b71c1c" />
          <path d="M-5 0 Q-12 15 -12 25 L-5 10 Z" fill="#ef5350" opacity="0.8" />
          <path d="M5 0 Q12 15 12 25 L5 10 Z" fill="#ef5350" opacity="0.8" />
        </g>

        {/* Bow Loops */}
        <path d="M30 22 C 15 22, 5 5, 30 20 Z" fill="url(#bow-red-grad)" stroke="#7f1d1d" strokeWidth="0.5" />
        <path d="M30 22 C 45 22, 55 5, 30 20 Z" fill="url(#bow-red-grad)" stroke="#7f1d1d" strokeWidth="0.5" />

        {/* Loop Depths */}
        <path d="M30 21 C 20 22, 10 15, 30 19" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="2" />
        <path d="M30 21 C 40 22, 50 15, 30 19" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="2" />

        {/* Center Knot */}
        <circle cx="30" cy="21" r="5" fill="#ffd700" stroke="#b8860b" strokeWidth="1" />
        <circle cx="30" cy="21" r="3" fill="none" stroke="#fff" strokeWidth="1" opacity="0.4" />
      </svg>
    </div>
  );
}

function SnowflakePattern() {
  return (
    <g fill="none" stroke="#ffd700" strokeWidth="1.2" opacity="0.8">
      <path d="M50 35 L50 85 M25 60 L75 60" strokeWidth="0.5" opacity="0.3" />
      {/* Central Star */}
      <g transform="translate(50, 60) scale(0.9)">
        <path d="M0 -12 V12 M-10 -6 L10 6 M-10 6 L10 -6" strokeWidth="1.5" />
      </g>
      {/* Small dots */}
      <circle cx="35" cy="45" r="1.5" fill="#fff" stroke="none" opacity="0.6" />
      <circle cx="65" cy="45" r="1.5" fill="#fff" stroke="none" opacity="0.6" />
      <circle cx="50" cy="80" r="1.5" fill="#fff" stroke="none" opacity="0.6" />
    </g>
  );
}

function OrnamentSvg({ isEnabled }: { isEnabled: boolean }) {
  return (
    <svg viewBox="0 0 100 110" className="size-full overflow-visible drop-shadow-lg" aria-hidden="true">
      <defs>
        <radialGradient id="ornament-red" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ff8a80" />
          <stop offset="40%" stopColor="#ef5350" />
          <stop offset="100%" stopColor="#c62828" />
        </radialGradient>

        <radialGradient id="ornament-silver" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#f5f5f5" />
          <stop offset="40%" stopColor="#e0e0e0" />
          <stop offset="100%" stopColor="#616161" />
        </radialGradient>

        <linearGradient id="cap-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#daa520" />
          <stop offset="50%" stopColor="#ffd700" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
      </defs>

      {/* The String stub inside SVG - perfectly aligned with top center (50,0) */}
      <path d="M50 0 L50 12" stroke="#eab308" strokeWidth="2" />

      {/* Metal Cap */}
      <rect x="42" y="10" width="16" height="10" rx="2" fill="url(#cap-gold)" stroke="#b8860b" strokeWidth="0.5" />
      <path d="M42 14 H58 M42 17 H58" stroke="#856404" strokeWidth="0.5" opacity="0.6" />

      {/* Ring */}
      <circle cx="50" cy="6" r="4" fill="none" stroke="#ffd700" strokeWidth="2" />

      {/* Main Ball Body */}
      <g className="transition-[fill,stroke] duration-500 ease-out">
        <circle
          cx="50"
          cy="60"
          r="38"
          fill={isEnabled ? 'url(#ornament-red)' : 'url(#ornament-silver)'}
          stroke={isEnabled ? '#b71c1c' : '#757575'}
          strokeWidth="0.5"
        />

        {/* Shadow Overlay */}
        <circle cx="50" cy="60" r="38" fill="black" fillOpacity="0.1" pointerEvents="none" />

        {/* Decoration */}
        <g
          className="origin-center transition-[opacity,transform] duration-300 ease-out"
          style={{
            opacity: isEnabled ? 1 : 0,
            transform: isEnabled ? 'scale(1)' : 'scale(0.95)',
          }}
        >
          <SnowflakePattern />
        </g>

        {/* Frost for disabled */}
        {!isEnabled && (
          <g opacity="0.5">
            <text
              x="50"
              y="65"
              fontSize="30"
              textAnchor="middle"
              fill="#9e9e9e"
              fontFamily="sans-serif"
              style={{ userSelect: 'none' }}
            >
              ❄
            </text>
          </g>
        )}

        {/* Highlight */}
        <ellipse cx="35" cy="45" rx="10" ry="6" transform="rotate(-45 35 45)" fill="white" opacity="0.4" />
        <circle cx="32" cy="40" r="2" fill="white" opacity="0.9" />
      </g>
    </svg>
  );
}

// Read initial state from DOM/localStorage to match FOUC prevention script
function getInitialState() {
  if (typeof document === 'undefined') {
    return { enabled: true, ornamentHidden: false };
  }
  return {
    enabled: document.documentElement.classList.contains('christmas'),
    ornamentHidden: localStorage.getItem('christmas-ornament-hidden') === 'true',
  };
}

export function ChristmasOrnamentToggle() {
  const storeValue = useStore(christmasEnabled);
  const isOrnamentHidden = useStore(ornamentHidden);
  const shouldReduceMotion = useReducedMotion();
  const [isPulling, setIsPulling] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  // Read initial state from DOM to match FOUC prevention script
  // This prevents hydration mismatch flash
  const [initialState] = useState(getInitialState);
  const isEnabled = hasMounted ? storeValue : initialState.enabled;
  const shouldShowOrnament = hasMounted ? !isOrnamentHidden : !initialState.ornamentHidden;

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const y = useMotionValue(0);
  const stringHeight = useTransform(y, (v) => STRING_HEIGHT + Math.max(0, v));

  const handleDragEnd = () => {
    setIsPulling(false);
    const currentY = y.get();
    if (currentY > TOGGLE_TRIGGER_DISTANCE) {
      if (isEnabled) {
        disableChristmas();
      } else {
        toggleChristmas();
      }
    }
  };

  const handleClick = () => toggleChristmas();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleChristmas();
    }
  };

  return (
    <AnimatePresence>
      {shouldShowOrnament && (
        <motion.div
          className="fixed top-0 right-0 tablet:right-12 z-90 flex w-[100px] justify-center lg:right-40"
          initial={{ opacity: 0, y: -50 }}
          animate={{
            opacity: isEnabled ? 1 : 0.5,
            y: 0,
          }}
          whileHover={{ opacity: 1 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <TopDecoration />

          {/* 绳子 - 顶部固定，高度随拖拽变化 */}
          <motion.div
            className="pointer-events-none absolute top-0 z-99 w-[2px] origin-top bg-linear-to-b from-yellow-700 via-yellow-500 to-yellow-400 will-change-[height]"
            style={{ height: stringHeight }}
          />

          {/* 球体 - 位置跟随绳子底部 */}
          <motion.button
            className={cn(
              'absolute cursor-grab touch-none select-none will-change-transform active:cursor-grabbing',
              'rounded-full outline-none focus-visible:ring-4 focus-visible:ring-yellow-400/50',
            )}
            style={{
              width: ORNAMENT_SIZE,
              height: ORNAMENT_SIZE,
              top: STRING_HEIGHT,
              y,
            }}
            drag={shouldReduceMotion ? false : 'y'}
            dragConstraints={{ top: 0, bottom: MAX_DRAG_DISTANCE }}
            dragElastic={0.2}
            dragSnapToOrigin
            onDragStart={() => setIsPulling(true)}
            onDragEnd={handleDragEnd}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={isEnabled ? '关闭圣诞模式' : '开启圣诞模式'}
            aria-pressed={isEnabled}
            type="button"
          >
            <div className="pointer-events-none -mt-2 size-full">
              <OrnamentSvg isEnabled={isEnabled} />
            </div>

            {/* 提示文字 */}
            <AnimatePresence>
              {(isPulling || isHovered) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 30 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2"
                >
                  <div className="whitespace-nowrap rounded-full border border-white/10 bg-red-950/90 px-3 py-1 font-medium text-[10px] text-white shadow-md">
                    {isEnabled ? '下拉关闭' : '下拉开启'}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
