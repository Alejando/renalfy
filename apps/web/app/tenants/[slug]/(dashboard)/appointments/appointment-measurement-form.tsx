'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { TemplateField } from '@repo/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { createMeasurementAction } from '../../../../actions/appointments';
import { AppointmentDynamicFields } from './appointment-dynamic-fields';

const FormSchema = z.object({
  recordedAt: z.string().min(1, 'La fecha y hora es obligatoria'),
  notes: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

type FormValues = z.infer<typeof FormSchema>;

interface AppointmentMeasurementFormProps {
  appointmentId: string;
  templateFields: TemplateField[];
  onSuccess: () => void;
  onClose: () => void;
}

const LABEL_CLASS =
  'block text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

export function AppointmentMeasurementForm({
  appointmentId,
  templateFields,
  onSuccess,
  onClose,
}: AppointmentMeasurementFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      recordedAt: '',
      notes: '',
      data: {},
    },
  });

  const onSubmit = async (formValues: FormValues) => {
    setServerError(null);
    const formData = new FormData();
    formData.append('recordedAt', formValues.recordedAt);
    if (formValues.notes) {
      formData.append('notes', formValues.notes);
    }
    const dataPayload = formValues.data ?? {};
    formData.append('data', JSON.stringify(dataPayload));

    const result = await createMeasurementAction(appointmentId, formData);
    if ('error' in result && result.error) {
      setServerError(result.error);
      return;
    }
    if ('measurement' in result) {
      onSuccess();
    }
  };

  return (
    <>
      {serverError && (
        <div className="mb-4 p-3 bg-destructive/10 rounded-lg">
          <p className="text-destructive text-sm font-medium">{serverError}</p>
        </div>
      )}
      <form
        aria-label="Nueva medición"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        {/* Recorded At */}
        <div className="space-y-2">
          <Label htmlFor="measurement-recorded-at" className={LABEL_CLASS}>
            Fecha y hora de medición <span className="text-destructive">*</span>
          </Label>
          <Input
            id="measurement-recorded-at"
            type="datetime-local"
            aria-label="Fecha y hora de medición"
            {...register('recordedAt')}
          />
          {errors.recordedAt && (
            <p className="text-sm text-destructive">{errors.recordedAt.message}</p>
          )}
        </div>

        {/* Dynamic fields from template */}
        <AppointmentDynamicFields
          fields={templateFields}
          register={register}
          errors={errors}
          fieldPrefix="data."
        />

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="measurement-notes" className={LABEL_CLASS}>
            Notas
          </Label>
          <Textarea
            id="measurement-notes"
            rows={3}
            placeholder="Observaciones adicionales..."
            {...register('notes')}
          />
        </div>

        {/* Actions */}
        <div className="pt-4 flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="gradient"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Guardando…' : 'Registrar medición'}
          </Button>
        </div>
      </form>
    </>
  );
}
