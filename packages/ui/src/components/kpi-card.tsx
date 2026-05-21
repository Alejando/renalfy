import * as React from 'react';
import { cn } from '../lib/utils';

export interface KpiCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  value?: React.ReactNode;
  subtitle?: React.ReactNode;
  accent?: boolean;
}

export const KpiCard = React.forwardRef<HTMLDivElement, KpiCardProps>(
  ({ className, title, value, subtitle, accent, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative rounded-rf border border-rf-line bg-rf-surface shadow-rf-xs p-6 overflow-hidden',
        className
      )}
      {...props}
    >
      {/* Corner decoration */}
      <div
        className={cn(
          'absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20',
          accent ? 'bg-rf-saffron' : 'bg-rf-primary-soft'
        )}
      />

      <div className="relative z-10">
        {title && <p className="text-sm font-medium uppercase text-rf-ink-muted">{title}</p>}
        {value && <p className="text-3xl font-bold text-rf-ink mt-2">{value}</p>}
        {subtitle && <p className="text-sm text-rf-ink-soft mt-1">{subtitle}</p>}
      </div>
    </div>
  )
);

KpiCard.displayName = 'KpiCard';
