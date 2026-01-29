/**
 * CategoryStats Component
 *
 * Displays category statistics as a bar chart visualization.
 */

import { cn } from '@lib/utils';

interface CategoryStatsProps {
  stats: { name: string; count: number }[];
  maxItems?: number;
}

export function CategoryStats({ stats, maxItems = 10 }: CategoryStatsProps) {
  const displayStats = stats.slice(0, maxItems);
  const maxCount = Math.max(...displayStats.map((s) => s.count), 1);

  if (displayStats.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-4 font-semibold text-sm">Categories</h3>
        <p className="text-muted-foreground text-sm">No categories found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 font-semibold text-sm">Categories</h3>
      <div className="space-y-3">
        {displayStats.map((stat) => (
          <div key={stat.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="truncate">{stat.name}</span>
              <span className="font-medium text-muted-foreground">{stat.count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-300')}
                style={{ width: `${(stat.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {stats.length > maxItems && (
        <p className="mt-3 text-muted-foreground text-xs">+{stats.length - maxItems} more categories</p>
      )}
    </div>
  );
}
