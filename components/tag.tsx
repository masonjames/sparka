'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Tag({
  children,
  className,
}: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'text-xs text-muted-foreground bg-muted px-1.5 py-1 rounded flex gap-1',
        className,
      )}
    >
      {children}
    </span>
  );
}
