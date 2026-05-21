import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const badgeVariants = cva('inline-flex items-center gap-2 rounded-rf-pill px-3 py-1 text-sm font-medium uppercase', {
  variants: {
    variant: {
      primary: 'bg-rf-primary-soft text-rf-primary-ink',
      saffron: 'bg-rf-saffron-soft text-rf-ink',
      success: 'bg-rf-success/15 text-rf-success',
      warning: 'bg-rf-warning/15 text-rf-warning',
      danger: 'bg-rf-danger/15 text-rf-danger',
      info: 'bg-rf-info/15 text-rf-info',
      coral: 'bg-rf-coral/15 text-rf-coral',
      neutral: 'bg-rf-surface-sunk text-rf-ink',
      flat: 'bg-rf-line text-rf-ink-muted',
    },
  },
  defaultVariants: {
    variant: 'primary',
  },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <div className={cn(badgeVariants({ variant }), className)} ref={ref} {...props} />
  )
);

Badge.displayName = 'Badge';
