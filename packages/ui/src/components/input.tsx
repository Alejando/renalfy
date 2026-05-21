import * as React from 'react';
import { cn } from '../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-rf border border-rf-line bg-rf-paper px-4 py-2 text-base text-rf-ink placeholder:text-rf-ink-soft transition-rf focus:outline-none focus:ring-2 focus:ring-rf-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-rf-danger focus:ring-rf-danger',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);

Input.displayName = 'Input';
