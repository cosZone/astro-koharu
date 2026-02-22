import { cn } from '@lib/utils';
import type { ReactNode } from 'react';

export default function Divider({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div className={cn('my-4 flex items-center', className)}>
      <span className="h-px grow bg-foreground/40" />
      {children ? <h2 className="mx-4 font-bold text-2xl text-foreground/60 tracking-widest">{children}</h2> : null}
      <span className="h-px grow bg-foreground/50" />
    </div>
  );
}
