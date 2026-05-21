import * as React from 'react';
import { cn } from '../lib/utils';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="w-12 h-12 rounded-full bg-rf-surface-sunk flex items-center justify-center mb-4">
        <span className="text-rf-ink-muted text-xl">○</span>
      </div>
      <p className="text-rf-ink font-medium mb-1">{title}</p>
      {description && <p className="text-rf-ink-muted text-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}
