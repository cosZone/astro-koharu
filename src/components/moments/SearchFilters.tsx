import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@components/ui/dropdown-menu';
import { cn } from '@lib/utils';
import { useEffect, useState } from 'react';

interface Option {
  value: string;
  label: string;
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: Option[];
  onSelect: (value: string) => void;
}

function ChevronIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-muted-foreground transition-transform duration-150 [[data-state=open]>&]:rotate-180"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4 shrink-0 text-primary"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function FilterSelect({ label, value, options, onSelect }: FilterSelectProps) {
  const current = options.find((option) => option.value === value) ?? options[0];
  return (
    <div className="grid min-w-0 gap-1 text-sm">
      <span className="text-muted-foreground text-xs">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`${label}: ${current?.label}`}
            className="flex min-h-9 w-full min-w-0 touch-manipulation items-center justify-between gap-2 rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-left outline-none transition-[border-color,box-shadow] hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="truncate">{current?.label}</span>
            <ChevronIcon />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-64 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto"
        >
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value || '__all__'}
              onSelect={() => onSelect(option.value)}
              className="justify-between"
            >
              <span className="truncate">{option.label}</span>
              {option.value === value && <CheckIcon />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export interface MomentsSearchFiltersProps {
  action: string;
  query?: string;
  channels: Option[];
  selectedChannelId?: string;
  sort: 'relevance' | 'newest';
  labels: {
    channel: string;
    allChannels: string;
    sort: string;
    relevance: string;
    newest: string;
  };
}

export default function MomentsSearchFilters({
  action,
  query,
  channels,
  selectedChannelId = '',
  sort,
  labels,
}: MomentsSearchFiltersProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // The native <select> grid is the no-JS baseline; swap it for this island.
    document.querySelector('[data-native-filters]')?.classList.add('hidden');
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const apply = (channel: string, nextSort: string) => {
    const url = new URL(action, window.location.origin);
    if (query) url.searchParams.set('q', query);
    if (channel) url.searchParams.set('channel', channel);
    if (nextSort && nextSort !== 'relevance') url.searchParams.set('sort', nextSort);
    window.location.assign(`${url.pathname}${url.search}`);
  };

  const channelOptions: Option[] = [{ value: '', label: labels.allChannels }, ...channels];
  const sortOptions: Option[] = [
    { value: 'relevance', label: labels.relevance },
    { value: 'newest', label: labels.newest },
  ];

  return (
    <div className={cn('grid grid-cols-2 gap-2')}>
      <FilterSelect
        label={labels.channel}
        value={selectedChannelId}
        options={channelOptions}
        onSelect={(channel) => apply(channel, sort)}
      />
      <FilterSelect
        label={labels.sort}
        value={sort}
        options={sortOptions}
        onSelect={(nextSort) => apply(selectedChannelId, nextSort)}
      />
    </div>
  );
}
