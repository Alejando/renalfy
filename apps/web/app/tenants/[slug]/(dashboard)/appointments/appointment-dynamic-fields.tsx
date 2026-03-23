'use client';

import type { TemplateField } from '@repo/types';
import type { UseFormRegister } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const LABEL_CLASS =
  'block text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

const SELECT_CLASS =
  'w-full bg-input border border-border rounded-md px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all appearance-none';

type DynamicFieldError = { message?: string } | undefined;

interface AppointmentDynamicFieldsProps {
  fields: TemplateField[];
  // Typed as the widest compatible type — concrete form registrar is cast at call site
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: Record<string, any>;
  fieldPrefix?: string;
}

export function AppointmentDynamicFields({
  fields,
  register,
  errors,
  fieldPrefix = 'clinicalData.',
}: AppointmentDynamicFieldsProps) {
  if (fields.length === 0) {
    return null;
  }

  return (
    <>
      {fields.map((field) => {
        const fieldName = `${fieldPrefix}${field.key}`;
        const nestedKey = fieldPrefix.replace(/\.$/, '');
        const nestedErrors = errors[nestedKey] as Record<string, DynamicFieldError> | undefined;
        const fieldError: DynamicFieldError = nestedErrors?.[field.key];

        return (
          <div key={field.key} className="space-y-2">
            {field.type === 'boolean' ? (
              <div className="flex items-center gap-3">
                <input
                  id={`dynamic-${field.key}`}
                  type="checkbox"
                  aria-label={field.label}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring/20"
                  {...register(fieldName)}
                />
                <Label htmlFor={`dynamic-${field.key}`} className={LABEL_CLASS}>
                  {field.label}
                  {field.required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </Label>
              </div>
            ) : (
              <>
                <Label htmlFor={`dynamic-${field.key}`} className={LABEL_CLASS}>
                  {field.label}
                  {field.required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </Label>
                {field.type === 'select' ? (
                  <select
                    id={`dynamic-${field.key}`}
                    aria-label={field.label}
                    className={SELECT_CLASS}
                    {...register(fieldName)}
                  >
                    <option value="">Selecciona una opción</option>
                    {(field.options ?? []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={`dynamic-${field.key}`}
                    type={field.type === 'number' ? 'number' : 'text'}
                    aria-label={field.label}
                    {...register(fieldName)}
                  />
                )}
                {fieldError && (
                  <p className="text-sm text-destructive">
                    {String(fieldError.message ?? 'Campo inválido')}
                  </p>
                )}
              </>
            )}
          </div>
        );
      })}
    </>
  );
}
