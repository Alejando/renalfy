import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const filterChipVariants = cva(
  'inline-flex items-center gap-2 rounded-rf-pill px-3 py-2 text-sm font-medium transition-rf cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rf-primary focus-visible:ring-offset-2',
  {
    variants: {
      active: {
        true: 'bg-rf-primary text-rf-on-primary',
        false: 'bg-rf-surface text-rf-ink-muted border border-rf-line hover:border-rf-primary hover:text-rf-primary',
      },
    },
    defaultVariants: {
      active: false,
    },
  }
);

export interface FilterChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof filterChipVariants> {}

export const FilterChip = React.forwardRef<HTMLButtonElement, FilterChipProps>(
  ({ className, active, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(filterChipVariants({ active }), className)}
      {...props}
    />
  )
);

FilterChip.displayName = 'FilterChip';
