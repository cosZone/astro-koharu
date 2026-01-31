/**
 * Category Stats Component
 *
 * Displays category statistics with horizontal bar charts.
 */

interface CategoryStatsProps {
  categories: { name: string; count: number }[];
  maxDisplay?: number;
}

export function CategoryStats({ categories, maxDisplay = 6 }: CategoryStatsProps) {
  const displayCategories = categories.slice(0, maxDisplay);
  const maxCount = Math.max(...displayCategories.map((c) => c.count), 1);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-4 font-semibold">Categories</h2>
      <div className="space-y-3">
        {displayCategories.map((cat) => {
          const percentage = (cat.count / maxCount) * 100;
          return (
            <div key={cat.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{cat.name}</span>
                <span className="text-muted-foreground">{cat.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
        {categories.length === 0 && <p className="text-muted-foreground text-sm">No categories found</p>}
      </div>
    </div>
  );
}
