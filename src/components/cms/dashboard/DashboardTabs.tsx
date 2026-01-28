/**
 * DashboardTabs Component
 *
 * Tab navigation for switching between Overview and Posts views.
 */

import { cn } from '@lib/utils';
import type { Tab } from './types';

interface DashboardTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  className?: string;
}

export function DashboardTabs({ activeTab, onTabChange, className }: DashboardTabsProps) {
  return (
    <div className={cn('flex gap-4', className)}>
      <button
        type="button"
        onClick={() => onTabChange('overview')}
        className={cn(
          'border-b-2 px-1 py-3 font-medium text-sm transition-colors',
          activeTab === 'overview'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground',
        )}
      >
        Overview
      </button>
      <button
        type="button"
        onClick={() => onTabChange('posts')}
        className={cn(
          'border-b-2 px-1 py-3 font-medium text-sm transition-colors',
          activeTab === 'posts'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground',
        )}
      >
        Posts
      </button>
    </div>
  );
}
