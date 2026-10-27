import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const filterChipVariants = cva(
  'inline-flex items-center gap-1.5 rounded-rf-pill px-3.5 h-9 text-sm font-semibold transition-rf cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rf-primary focus-visible:ring-offset-2 select-none whitespace-nowrap',
  {
    variants: {
      active: {
        true:  'bg-rf-ink text-white border border-rf-ink',
        false: 'bg-rf-surface text-rf-ink-muted border border-rf-line-strong hover:border-rf-primary/40 hover:text-rf-ink',
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
