/**
 * Mac window traffic light dots (red, yellow, green).
 * When handlers are provided, dots become interactive buttons with hover icons.
 */

import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';

interface TrafficLightsProps {
  onClose?: () => void;
  onFullscreen?: () => void;
}

export function TrafficLights({ onClose, onFullscreen }: TrafficLightsProps) {
  const interactive = !!(onClose || onFullscreen);
  return (
    <div className={cn('flex gap-2', interactive && 'group')}>
      <TrafficDot
        color="bg-[#ff5f56]"
        onClick={onClose}
        aria-label="关闭"
        icon={onClose ? <Icon icon="mingcute:close-fill" className="text-black" /> : null}
      />
      <TrafficDot color="bg-[#ffbd2e]" icon={null} />
      <TrafficDot
        color="bg-[#27c93f]"
        onClick={onFullscreen}
        aria-label="全屏"
        icon={onFullscreen ? <Icon icon="mingcute:fullscreen-2-fill" className="text-black" /> : null}
      />
    </div>
  );
}

function TrafficDot({
  color,
  onClick,
  'aria-label': ariaLabel,
  icon,
}: {
  color: string;
  onClick?: () => void;
  'aria-label'?: string;
  icon: React.ReactNode;
}) {
  const base = cn('relative size-3 rounded-full', color);

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(base, 'cursor-default')} aria-label={ariaLabel}>
        <span className="absolute inset-0 flex items-center justify-center p-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {icon}
        </span>
      </button>
    );
  }

  return (
    <span className={base}>
      {icon && (
        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          {icon}
        </span>
      )}
    </span>
  );
}
