import { microDampingPreset } from '@constants/anim/spring';
import type { FriendLink } from '@constants/friends-config';
import { useIsMounted } from '@hooks/useIsMounted';
import { useStore } from '@nanostores/react';
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react';
import { type MouseEvent, useRef } from 'react';
import { cn } from '@/lib/utils';
import { christmasEnabled } from '@/store/christmas';

interface FriendCardProps {
  friend: FriendLink;
  index: number;
}

/** CSS 自定义属性类型扩展 */
interface CSSCustomProperties extends React.CSSProperties {
  '--card-color'?: string;
}

const DEFAULT_COLOR = '#ffc0cb';
// Cute SVG Avatar Data URI (Pink Theme)
const DEFAULT_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg width="100%" height="100%" viewBox="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="#ffc0cb"/>
  <circle cx="30" cy="45" r="6" fill="#fff"/>
  <circle cx="70" cy="45" r="6" fill="#fff"/>
  <path d="M 35 65 Q 50 75 65 65" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="20" cy="55" r="6" fill="#ff9eb5" opacity="0.5"/>
  <circle cx="80" cy="55" r="6" fill="#ff9eb5" opacity="0.5"/>
</svg>
`)}`;

export default function FriendCard({ friend, index }: FriendCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const isMounted = useIsMounted();
  const isChristmasEnabled = useStore(christmasEnabled);

  // Motion values for magnetic hover
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Spring animation for smooth magnetic effect
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [15, -15]), microDampingPreset);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-15, 15]), microDampingPreset);

  // Spotlight effect
  const sheenX = useTransform(x, [-0.5, 0.5], ['0%', '100%']);
  const sheenY = useTransform(y, [-0.5, 0.5], ['0%', '100%']);

  const spotlight = useMotionTemplate`radial-gradient(
    600px circle at ${sheenX} ${sheenY},
    rgba(255,255,255,0.15),
    transparent 40%
  )`;

  const handleMouseMove = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const offsetX = (e.clientX - centerX) / rect.width;
    const offsetY = (e.clientY - centerY) / rect.height;

    x.set(offsetX);
    y.set(offsetY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const cardColor = friend.color || DEFAULT_COLOR;
  const avatarImage = friend.image || DEFAULT_AVATAR;

  return (
    <motion.a
      href={friend.url}
      target="_blank"
      ref={cardRef}
      className={cn(
        'friend-card group relative block h-[200px] w-full cursor-pointer select-none transition-transform duration-300 ease-easeOut',
        { 'z-5': isMounted && isChristmasEnabled },
      )}
      style={{ perspective: '1000px' }}
      transition={{
        duration: 0.5,
        delay: index * 0.05,
        ...microDampingPreset,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="relative h-full w-full rounded-2xl bg-white p-3 shadow-xl ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-white/10"
        style={{
          transformStyle: 'preserve-3d',
          rotateX,
          rotateY,
        }}
      >
        {/* Inner Card Container */}
        <div className="relative h-full w-full overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-900">
          {/* Background Image / Color */}
          <div
            className="absolute inset-0 h-16 w-full"
            style={{ background: `linear-gradient(to bottom right, ${cardColor}, ${cardColor}80)` }}
          />

          {/* Avatar */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2">
            <div className="relative h-14 w-14 overflow-hidden rounded-full border-4 border-white bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800">
              <img
                src={avatarImage}
                alt={friend.owner}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
            </div>
          </div>

          {/* Content */}
          <div className="mt-24 flex h-full flex-col px-2 pb-3 text-center">
            <h3
              className="truncate font-bold text-gray-900 text-sm transition-colors group-hover:text-(--card-color) dark:text-white"
              style={{ '--card-color': cardColor } as CSSCustomProperties}
            >
              {friend.owner}
            </h3>
            <p className="mb-1 truncate font-medium text-[10px] text-gray-400 uppercase tracking-wider">{friend.site}</p>
            <p className="line-clamp-2 text-[10px] text-gray-600 dark:text-gray-300">{friend.desc}</p>
          </div>
        </div>

        {/* Spotlight Overlay */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: spotlight,
          }}
        />

        {/* Border Glow */}
        <div
          className="absolute inset-0 -z-10 rounded-2xl opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-60"
          style={{ background: cardColor }}
        />
      </motion.div>
    </motion.a>
  );
}
