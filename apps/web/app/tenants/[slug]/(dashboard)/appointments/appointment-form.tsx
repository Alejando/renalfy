'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { LocationResponse, ServiceTypeResponse, UserRole, TemplateField } from '@repo/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  createAppointmentAction,
  fetchClinicalTemplateByServiceTypeAction,
} from '../../../../actions/appointments';
import { AppointmentDynamicFields } from './appointment-dynamic-fields';

const FormSchema = z.object({
  patientId: z.string().uuid('Selecciona un paciente'),
  locationId: z.string().uuid(),
  serviceTypeId: z.string().uuid().optional().or(z.literal('')),
  scheduledAt: z.string().min(1, 'La fecha y hora es obligatoria'),
  notes: z.string().optional(),
  clinicalData: z.record(z.string(), z.unknown()).optional(),
});

type FormValues = z.infer<typeof FormSchema>;

interface PatientOption {
  id: string;
  name: string;
}

interface AppointmentFormProps {
  onSuccess: () => void;
  onClose: () => void;
  locations: LocationResponse[];
  serviceTypes: ServiceTypeResponse[];
  patients: PatientOption[];
  userLocationId: string | null;
  userRole: UserRole;
}

const LABEL_CLASS =
  'block text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

const SELECT_CLASS =
  'w-full bg-input border border-border rounded-md px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all appearance-none';

const REQUIRES_LOCATION_SELECTOR: UserRole[] = ['OWNER', 'ADMIN'];

export function AppointmentForm({
  onSuccess,
  onClose,
  locations,
  serviceTypes,
  patients,
  userLocationId,
  userRole,
}: AppointmentFormProps) {
  const showLocationSelector = REQUIRES_LOCATION_SELECTOR.includes(userRole);
  const [serverError, setServerError] = useState<string | null>(null);
  const [templateFields, setTemplateFields] = useState<TemplateField[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      patientId: '',
      locationId: userLocationId ?? '',
      serviceTypeId: '',
      scheduledAt: '',
      notes: '',
    },
  });

  const serviceTypeId = watch('serviceTypeId');

  useEffect(() => {
    if (!serviceTypeId) {
      setTemplateFields([]);
      return;
    }

    void fetchClinicalTemplateByServiceTypeAction(serviceTypeId).then((template) => {
      setTemplateFields(template?.fields ?? []);
    });
  }, [serviceTypeId]);

  const onSubmit = async (data: FormValues) => {
    setServerError(null);
    const formData = new FormData();
    formData.append('patientId', data.patientId);
    formData.append('locationId', data.locationId);
    if (data.serviceTypeId) {
      formData.append('serviceTypeId', data.serviceTypeId);
    }
    formData.append('scheduledAt', data.scheduledAt);
    if (data.notes) {
      formData.append('notes', data.notes);
    }
    if (data.clinicalData && Object.keys(data.clinicalData).length > 0) {
      formData.append('clinicalData', JSON.stringify(data.clinicalData));
    }

    const result = await createAppointmentAction(null, formData);
    if ('error' in result && result.error) {
      setServerError(result.error);
      return;
    }
    if ('appointment' in result) {
      onSuccess();
    }
  };

  return (
    <>
      {serverError && (
        <div className="mx-0 mb-4 p-3 bg-destructive/10 rounded-lg">
          <p className="text-destructive text-sm font-medium">{serverError}</p>
        </div>
      )}
      <form
        aria-label="Nueva cita"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        {/* Patient */}
        <div className="space-y-2">
          <Label htmlFor="appt-patient" className={LABEL_CLASS}>
            Paciente <span className="text-destructive">*</span>
          </Label>
          <select
            id="appt-patient"
            aria-label="Paciente"
            className={SELECT_CLASS}
            {...register('patientId')}
          >
            <option value="">Selecciona un paciente</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {errors.patientId && (
            <p className="text-sm text-destructive">{errors.patientId.message}</p>
          )}
        </div>

        {/* Location — OWNER/ADMIN only */}
        {showLocationSelector ? (
          <div className="space-y-2">
            <Label htmlFor="appt-location" className={LABEL_CLASS}>
              Sucursal <span className="text-destructive">*</span>
            </Label>
            <select
              id="appt-location"
              className={SELECT_CLASS}
              {...register('locationId')}
            >
              <option value="">Selecciona una sucursal</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
            {errors.locationId && (
              <p className="text-sm text-destructive">{errors.locationId.message}</p>
            )}
          </div>
        ) : null}

        {/* Service Type */}
        <div className="space-y-2">
          <Label htmlFor="appt-service-type" className={LABEL_CLASS}>
            Tipo de servicio
          </Label>
          <select
            id="appt-service-type"
            aria-label="Tipo de servicio"
            className={SELECT_CLASS}
            {...register('serviceTypeId')}
          >
            <option value="">Sin tipo de servicio</option>
            {serviceTypes.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
        </div>

        {/* Scheduled At */}
        <div className="space-y-2">
          <Label htmlFor="appt-scheduled-at" className={LABEL_CLASS}>
            Fecha y hora <span className="text-destructive">*</span>
          </Label>
          <Input
            id="appt-scheduled-at"
            type="datetime-local"
            aria-label="Fecha y hora"
            {...register('scheduledAt')}
          />
          {errors.scheduledAt && (
            <p className="text-sm text-destructive">{errors.scheduledAt.message}</p>
          )}
        </div>

        {/* Dynamic clinical template fields */}
        <AppointmentDynamicFields
          fields={templateFields}
          register={register}
          errors={errors}
        />

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="appt-notes" className={LABEL_CLASS}>
            Notas
          </Label>
          <Textarea
            id="appt-notes"
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
            {isSubmitting ? 'Guardando…' : 'Crear cita'}
          </Button>
        </div>
      </form>
    </>
  );
}
