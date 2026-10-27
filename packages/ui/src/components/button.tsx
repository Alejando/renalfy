import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-rf font-medium transition-rf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary:
          'bg-rf-primary text-rf-on-primary hover:bg-rf-primary-hover active:bg-rf-primary-dark',
        secondary: 'bg-rf-surface text-rf-ink border border-rf-line hover:bg-rf-surface-sunk',
        ghost: 'text-rf-ink hover:bg-rf-surface-sunk',
        danger: 'bg-rf-danger text-white hover:bg-red-600 active:bg-red-700',
        saffron: 'bg-rf-saffron text-white hover:bg-rf-saffron-hover',
        dark: 'bg-rf-primary-dark text-white hover:bg-rf-primary-darker',
        gradient:
          '[background:linear-gradient(135deg,var(--rf-primary),var(--rf-primary-dark))] text-white hover:[background:linear-gradient(135deg,var(--rf-primary-hover),var(--rf-primary-dark))]',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        base: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'base',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
);

Button.displayName = 'Button';
