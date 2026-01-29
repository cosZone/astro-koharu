/**
 * DashboardStats Component
 *
 * Displays key statistics cards: total posts, published, drafts.
 */

import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';

interface StatCardProps {
  icon: string;
  iconColor: string;
  label: string;
  value: number;
  className?: string;
}

function StatCard({ icon, iconColor, label, value, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50',
        className,
      )}
    >
      <div className={cn('flex size-12 items-center justify-center rounded-full bg-muted', iconColor)}>
        <Icon icon={icon} className="size-6" />
      </div>
      <div>
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="font-bold text-2xl">{value}</p>
      </div>
    </div>
  );
}

interface DashboardStatsProps {
  total: number;
  published: number;
  draft: number;
}

export function DashboardStats({ total, published, draft }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard icon="ri:article-line" iconColor="text-blue-500" label="Total Posts" value={total} />
      <StatCard icon="ri:check-double-line" iconColor="text-green-500" label="Published" value={published} />
      <StatCard icon="ri:draft-line" iconColor="text-orange-500" label="Drafts" value={draft} />
    </div>
  );
}
