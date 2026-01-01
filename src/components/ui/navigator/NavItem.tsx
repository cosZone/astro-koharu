import { cn } from '@lib/utils';
import type { ClassValue } from 'clsx';
import { motion } from 'motion/react';
import type { JSX } from 'react';

export type NavItemProps = {
  selected?: boolean;
  name?: string;
  icon?: JSX.Element;
  onClick?: () => void;
  className?: ClassValue;
  indicatorClass?: string;
  type?: 'header' | 'sider';
  layoutIdPrefix?: string;
};
function NavItem({
  selected,
  icon,
  name,
  onClick,
  className,
  indicatorClass,
  type = 'header',
  layoutIdPrefix = 'header',
}: NavItemProps) {
  return (
    <button
      type="button"
      className={cn(
        'relative flex w-full cursor-pointer items-center justify-center bg-transparent text-base',
        {
          'text-white': selected && type !== 'header',
          'text-primary': selected && type === 'header',
          'z-0': type === 'sider',
        },
        className,
      )}
      onClick={onClick}
    >
      {icon}
      {name}
      {selected && (
        <motion.div
          className={cn(
            'absolute inset-x-0 -bottom-1.5 border-primary border-t-2',
            {
              'inset-0 -z-10 rounded-lg border-none bg-gradient-pink': type === 'sider',
            },
            indicatorClass,
          )}
          layoutId={`${layoutIdPrefix ?? 'header'}_tab_selected`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        />
      )}
    </button>
  );
}
export default NavItem;
