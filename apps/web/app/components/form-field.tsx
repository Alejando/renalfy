import type { InputHTMLAttributes } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children?: React.ReactNode;
}

const LABEL_CLASS =
  'block text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

export function FormField({
  id,
  label,
  required,
  error,
  children,
  className,
  ...inputProps
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={LABEL_CLASS}>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children ?? (
        <Input
          id={id}
          className={cn(className)}
          aria-invalid={error !== undefined ? true : undefined}
          {...inputProps}
        />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
