/* eslint-disable react/prop-types */
import * as React from 'react';
import { cn } from '../lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-24 w-full rounded-rf border border-rf-line bg-rf-paper px-4 py-2 text-base text-rf-ink placeholder:text-rf-ink-soft transition-rf focus:outline-none focus:ring-2 focus:ring-rf-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 resize-none',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);

Textarea.displayName = 'Textarea';
