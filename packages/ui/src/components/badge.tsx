import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-rf-pill px-2.5 font-bold uppercase tracking-wide whitespace-nowrap',
  {
    variants: {
      variant: {
        primary: 'bg-rf-primary-soft text-rf-primary-ink',
        saffron: 'bg-rf-saffron-soft text-rf-saffron-ink',
        success: 'bg-rf-success-soft text-rf-success-ink',
        warning: 'bg-rf-warning-soft text-rf-warning-ink',
        danger:  'bg-rf-danger-soft text-rf-danger-ink',
        info:    'bg-rf-info-soft text-rf-info-ink',
        coral:   'bg-rf-coral-soft text-rf-coral-ink',
        neutral: 'bg-rf-surface-sunk text-rf-ink-muted',
        flat:    'border border-rf-line-strong bg-transparent text-rf-ink-muted',
      },
      size: {
        sm: 'h-[22px] text-[10.5px]',
        md: 'h-[26px] text-xs',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'sm',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div className={cn(badgeVariants({ variant, size }), className)} ref={ref} {...props} />
  )
);

Badge.displayName = 'Badge';
