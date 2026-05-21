import * as React from 'react';
import { cn } from '../lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div>
        <h1 className="text-2xl font-bold text-rf-ink font-headline">{title}</h1>
        {description && <p className="text-rf-ink-muted text-sm mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
