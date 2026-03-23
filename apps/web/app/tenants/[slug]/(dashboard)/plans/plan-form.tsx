'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { PlanResponse, LocationResponse, ServiceTypeResponse, UserRole } from '@repo/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { createPlanAction, updatePlanAction } from '../../../../actions/plans';

const FormSchema = z.object({
  patientId: z.string().uuid('Selecciona un paciente'),
  locationId: z.string().optional(),
  companyId: z.string().optional(),
  serviceTypeId: z.string().optional(),
  startDate: z.string().min(1, 'La fecha de inicio es obligatoria'),
  plannedSessions: z
    .number()
    .int()
    .min(1, 'Sesiones debe ser mayor a 0'),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Formato de monto inválido (ej. 5000.00)'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof FormSchema>;

interface PatientOption {
  id: string;
  name: string;
}

interface CompanyOption {
  id: string;
  name: string;
}

interface PlanFormProps {
  onSuccess: () => void;
  onClose: () => void;
  plan?: PlanResponse | null;
  patients: PatientOption[];
  companies: CompanyOption[];
  serviceTypes: ServiceTypeResponse[];
  locations?: LocationResponse[];
  userRole: UserRole;
  userLocationId: string | null;
}

const LABEL_CLASS =
  'block text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

const SELECT_CLASS =
  'w-full bg-input border border-border rounded-md px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all appearance-none';

const REQUIRES_LOCATION_SELECTOR: UserRole[] = ['OWNER', 'ADMIN'];

const isEditMode = (plan: PlanResponse | null | undefined): plan is PlanResponse =>
  plan != null;

export function PlanForm({
  onSuccess,
  onClose,
  plan,
  patients,
  companies,
  serviceTypes,
  locations = [],
  userRole,
  userLocationId,
}: PlanFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const editMode = isEditMode(plan);
  const showLocationSelector = REQUIRES_LOCATION_SELECTOR.includes(userRole);

  const defaultStartDate = plan?.startDate
    ? plan.startDate.toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      patientId: plan?.patientId ?? '',
      locationId: plan?.locationId ?? userLocationId ?? '',
      companyId: plan?.companyId ?? '',
      serviceTypeId: plan?.serviceTypeId ?? '',
      startDate: defaultStartDate ?? '',
      plannedSessions: plan?.plannedSessions ?? 1,
      amount: plan?.amount ?? '',
      notes: plan?.notes ?? '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    setServerError(null);
    const formData = new FormData();
    if (editMode) {
      formData.append('id', plan.id);
    }
    formData.append('patientId', data.patientId);
    if (data.locationId) formData.append('locationId', data.locationId);
    if (data.companyId) formData.append('companyId', data.companyId);
    if (data.serviceTypeId) formData.append('serviceTypeId', data.serviceTypeId);
    formData.append('startDate', data.startDate);
    formData.append('plannedSessions', data.plannedSessions.toString());
    formData.append('amount', data.amount);
    if (data.notes) formData.append('notes', data.notes);

    const action = editMode ? updatePlanAction : createPlanAction;
    const result = await action(null, formData);
    if (result?.error) {
      setServerError(result.error);
      return;
    }
    onSuccess();
  };

  return (
    <>
      {serverError && (
        <div className="mb-4 p-3 bg-destructive/10 rounded-lg">
          <p className="text-destructive text-sm font-medium">{serverError}</p>
        </div>
      )}
      <form
        aria-label={editMode ? 'Editar plan' : 'Nuevo plan'}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        {/* Paciente */}
        <div className="space-y-2">
          <Label htmlFor="plan-patient" className={LABEL_CLASS}>
            Paciente <span className="text-destructive">*</span>
          </Label>
          <select
            id="plan-patient"
            aria-label="Paciente"
            className={SELECT_CLASS}
            disabled={editMode}
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

        {/* Sucursal — OWNER/ADMIN only */}
        {showLocationSelector ? (
          <div className="space-y-2">
            <Label htmlFor="plan-location" className={LABEL_CLASS}>
              Sucursal
            </Label>
            <select
              id="plan-location"
              aria-label="Sucursal"
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
        ) : (
          <div className="space-y-2">
            <Label htmlFor="plan-location-readonly" className={LABEL_CLASS}>
              Sucursal
            </Label>
            <select
              id="plan-location-readonly"
              aria-label="Sucursal"
              className={SELECT_CLASS}
              disabled
              value={userLocationId ?? ''}
              onChange={() => undefined}
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Empresa */}
        <div className="space-y-2">
          <Label htmlFor="plan-company" className={LABEL_CLASS}>
            Empresa
          </Label>
          <select
            id="plan-company"
            aria-label="Empresa"
            className={SELECT_CLASS}
            {...register('companyId')}
          >
            <option value="">Sin empresa</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de Servicio */}
        <div className="space-y-2">
          <Label htmlFor="plan-service-type" className={LABEL_CLASS}>
            Tipo de Servicio
          </Label>
          <select
            id="plan-service-type"
            aria-label="Tipo de Servicio"
            className={SELECT_CLASS}
            {...register('serviceTypeId')}
          >
            <option value="">Sin tipo de servicio específico</option>
            {serviceTypes.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
        </div>

        {/* Fecha de Inicio */}
        <div className="space-y-2">
          <Label htmlFor="plan-start-date" className={LABEL_CLASS}>
            Fecha de Inicio <span className="text-destructive">*</span>
          </Label>
          <Input
            id="plan-start-date"
            type="date"
            aria-label="Fecha de Inicio"
            {...register('startDate')}
          />
          {errors.startDate && (
            <p className="text-sm text-destructive">{errors.startDate.message}</p>
          )}
        </div>

        {/* Sesiones Planeadas */}
        <div className="space-y-2">
          <Label htmlFor="plan-sessions" className={LABEL_CLASS}>
            Sesiones Planeadas <span className="text-destructive">*</span>
          </Label>
          <Input
            id="plan-sessions"
            type="number"
            min={1}
            step={1}
            aria-label="Sesiones Planeadas"
            {...register('plannedSessions', { valueAsNumber: true })}
          />
          {errors.plannedSessions && (
            <p className="text-sm text-destructive">{errors.plannedSessions.message}</p>
          )}
        </div>

        {/* Monto */}
        <div className="space-y-2">
          <Label htmlFor="plan-amount" className={LABEL_CLASS}>
            Monto <span className="text-destructive">*</span>
          </Label>
          <Input
            id="plan-amount"
            type="text"
            aria-label="Monto"
            placeholder="Ej. 5000.00"
            {...register('amount')}
          />
          {errors.amount && (
            <p className="text-sm text-destructive">{errors.amount.message}</p>
          )}
        </div>

        {/* Notas */}
        <div className="space-y-2">
          <Label htmlFor="plan-notes" className={LABEL_CLASS}>
            Notas
          </Label>
          <Textarea
            id="plan-notes"
            aria-label="Notas"
            rows={3}
            placeholder="Notas adicionales..."
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
            {isSubmitting ? 'Guardando…' : editMode ? 'Guardar Cambios' : 'Crear Plan'}
          </Button>
        </div>
      </form>
    </>
  );
}
