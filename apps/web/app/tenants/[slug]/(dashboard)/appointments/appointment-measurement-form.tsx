'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { TemplateField } from '@repo/types';
import { Input, Label, Textarea, Button } from '@repo/ui';
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
  'block text-[10px] font-label uppercase tracking-widest text-rf-ink-soft font-semibold';

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
        <div
          className="mb-4 p-3 rounded-lg"
          style={{
            background: 'var(--rf-danger-soft)',
            border: '1px solid var(--rf-danger)',
          }}
        >
          <p className="text-rf-danger text-sm font-medium">{serverError}</p>
        </div>
      )}
      <form
        aria-label="Nueva medición"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        <div className="space-y-2">
          <Label htmlFor="measurement-recorded-at" className={LABEL_CLASS}>
            Fecha y hora de medición <span className="text-rf-danger">*</span>
          </Label>
          <Input
            id="measurement-recorded-at"
            type="datetime-local"
            aria-label="Fecha y hora de medición"
            {...register('recordedAt')}
          />
          {errors.recordedAt && (
            <p className="text-sm text-rf-danger">{errors.recordedAt.message}</p>
          )}
        </div>

        <AppointmentDynamicFields
          fields={templateFields}
          register={register}
          errors={errors}
          fieldPrefix="data."
        />

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

        <div className="pt-4 flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
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
