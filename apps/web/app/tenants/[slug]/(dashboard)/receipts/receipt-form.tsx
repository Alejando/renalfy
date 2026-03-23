'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { LocationResponse, ServiceTypeResponse, UserRole } from '@repo/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { createReceiptAction } from '../../../../actions/receipts';
import { PAYMENT_TYPE_LABELS, PAYMENT_TYPES } from './receipt-constants';

const FormSchema = z
  .object({
    patientId: z.string().uuid('Selecciona un paciente'),
    locationId: z.string().uuid(),
    serviceTypeId: z.string().uuid().optional(),
    appointmentId: z.string().uuid().optional(),
    planId: z.string().optional(),
    date: z.string().min(1, 'La fecha es obligatoria'),
    amount: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Formato de monto inválido (ej. 500.00)'),
    paymentType: z.enum([
      'CASH',
      'CREDIT',
      'BENEFIT',
      'INSURANCE',
      'TRANSFER',
    ] as const),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentType === 'BENEFIT' && !data.planId) {
      ctx.addIssue({
        path: ['planId'],
        code: z.ZodIssueCode.custom,
        message: 'Plan es requerido para pagos de tipo Beneficio',
      });
    }
  });

type FormValues = z.infer<typeof FormSchema>;

interface PatientOption {
  id: string;
  name: string;
}

interface PlanOption {
  id: string;
  name: string;
  status: string;
}

interface ReceiptFormProps {
  onSuccess: (folio: string) => void;
  onClose: () => void;
  locations: LocationResponse[];
  serviceTypes: ServiceTypeResponse[];
  patients: PatientOption[];
  plans?: PlanOption[];
  userLocationId: string | null;
  userRole: UserRole;
}

const LABEL_CLASS =
  'block text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

const SELECT_CLASS =
  'w-full bg-input border border-border rounded-md px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all appearance-none';

const REQUIRES_LOCATION_SELECTOR: UserRole[] = ['OWNER', 'ADMIN'];

export function ReceiptForm({
  onSuccess,
  onClose,
  locations,
  serviceTypes,
  patients,
  plans = [],
  userLocationId,
  userRole,
}: ReceiptFormProps) {
  const showLocationSelector = REQUIRES_LOCATION_SELECTOR.includes(userRole);
  const [serverError, setServerError] = useState<string | null>(null);

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
      date: '',
      amount: '',
      paymentType: 'CASH',
      notes: '',
    },
  });

  const paymentType = watch('paymentType');
  const isBenefit = paymentType === 'BENEFIT';

  const onSubmit = async (data: FormValues) => {
    setServerError(null);
    const formData = new FormData();
    formData.append('patientId', data.patientId);
    formData.append('locationId', data.locationId);
    if (data.serviceTypeId) {
      formData.append('serviceTypeId', data.serviceTypeId);
    }
    if (data.appointmentId) {
      formData.append('appointmentId', data.appointmentId);
    }
    if (data.planId) {
      formData.append('planId', data.planId);
    }
    formData.append('date', data.date);
    formData.append('amount', data.amount);
    formData.append('paymentType', data.paymentType);
    if (data.notes) {
      formData.append('notes', data.notes);
    }

    const result = await createReceiptAction(null, formData);
    if ('error' in result && result.error) {
      setServerError(result.error);
      return;
    }
    if ('receipt' in result) {
      onSuccess(result.receipt.folio);
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
        aria-label="Nuevo recibo"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        {/* Patient */}
        <div className="space-y-2">
          <Label htmlFor="receipt-patient" className={LABEL_CLASS}>
            Paciente <span className="text-destructive">*</span>
          </Label>
          <select
            id="receipt-patient"
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
            <Label htmlFor="receipt-location" className={LABEL_CLASS}>
              Sucursal <span className="text-destructive">*</span>
            </Label>
            <select
              id="receipt-location"
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
          <Label htmlFor="receipt-service-type" className={LABEL_CLASS}>
            Tipo de servicio
          </Label>
          <select
            id="receipt-service-type"
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

        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="receipt-date" className={LABEL_CLASS}>
            Fecha <span className="text-destructive">*</span>
          </Label>
          <Input
            id="receipt-date"
            type="date"
            aria-label="Fecha"
            {...register('date')}
          />
          {errors.date && (
            <p className="text-sm text-destructive">{errors.date.message}</p>
          )}
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <Label htmlFor="receipt-amount" className={LABEL_CLASS}>
            Monto <span className="text-destructive">*</span>
          </Label>
          <Input
            id="receipt-amount"
            type="text"
            aria-label="Monto"
            placeholder="Ej. 500.00"
            {...register('amount')}
          />
          {errors.amount && (
            <p className="text-sm text-destructive">{errors.amount.message}</p>
          )}
        </div>

        {/* Payment Type */}
        <div className="space-y-2">
          <Label htmlFor="receipt-payment-type" className={LABEL_CLASS}>
            Tipo de pago <span className="text-destructive">*</span>
          </Label>
          <select
            id="receipt-payment-type"
            aria-label="Tipo de pago"
            className={SELECT_CLASS}
            {...register('paymentType')}
          >
            {PAYMENT_TYPES.map((pt) => (
              <option key={pt} value={pt}>
                {PAYMENT_TYPE_LABELS[pt]}
              </option>
            ))}
          </select>
          {errors.paymentType && (
            <p className="text-sm text-destructive">{errors.paymentType.message}</p>
          )}
        </div>

        {/* Plan — only for BENEFIT payments */}
        {isBenefit && (
          <div className="space-y-2">
            <Label htmlFor="receipt-plan" className={LABEL_CLASS}>
              Plan <span className="text-destructive">*</span>
            </Label>
            <select
              id="receipt-plan"
              aria-label="Plan"
              className={SELECT_CLASS}
              {...register('planId')}
            >
              <option value="">Selecciona un plan</option>
              {plans
                .filter((p) => p.status !== 'EXHAUSTED')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            {errors.planId && (
              <p className="text-sm text-destructive">{errors.planId.message}</p>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="receipt-notes" className={LABEL_CLASS}>
            Notas
          </Label>
          <Textarea
            id="receipt-notes"
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
            {isSubmitting ? 'Guardando…' : 'Crear recibo'}
          </Button>
        </div>
      </form>
    </>
  );
}
