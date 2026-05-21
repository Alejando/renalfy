'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createExpenseAction } from '../../../../actions/financials';

const CreateExpenseFormSchema = z.object({
  locationId: z.string().uuid('ID de sucursal inválido').optional(),
  date: z.string().min(1, 'Fecha es requerida'),
  type: z.string().min(1, 'Tipo es requerido'),
  amount: z
    .string()
    .min(1, 'Monto es requerido')
    .regex(/^\d+(\.\d{1,2})?$/, 'Formato de monto inválido'),
  description: z.string().max(500).optional(),
});

type CreateExpenseFormData = z.infer<typeof CreateExpenseFormSchema>;

const EXPENSE_TYPES = [
  { value: 'PAYROLL', label: 'Nómina' },
  { value: 'SUPPLIES', label: 'Suministros' },
  { value: 'UTILITIES', label: 'Servicios' },
  { value: 'MAINTENANCE', label: 'Mantenimiento' },
  { value: 'OTHER', label: 'Otro' },
] as const;

interface CreateExpenseDrawerProps {
  open: boolean;
  onClose: () => void;
  locationId?: string | null;
}

export function CreateExpenseDrawer({ open, onClose, locationId }: CreateExpenseDrawerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateExpenseFormData>({
    resolver: zodResolver(CreateExpenseFormSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      type: 'SUPPLIES',
      amount: '',
      description: '',
    },
  });

  const onSubmit = useCallback(
    async (data: CreateExpenseFormData) => {
      setError(null);
      setIsSubmitting(true);

      try {
        const result = await createExpenseAction({
          date: data.date,
          type: data.type,
          amount: data.amount,
          description: data.description,
          locationId: locationId ?? data.locationId ?? '',
        });

        if (result.error) {
          setError(result.error);
          setIsSubmitting(false);
        } else {
          reset();
          onClose();
          router.refresh();
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error al crear el egreso');
        setIsSubmitting(false);
      }
    },
    [onClose, reset, router, locationId]
  );

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen: boolean) => {
        if (!isOpen) {
          onClose();
          setError(null);
        }
      }}
    >
      <SheetContent side="right" className="w-full max-w-md flex flex-col p-0">
        <SheetHeader className="px-8 py-6 bg-muted">
          <SheetTitle className="font-headline font-bold text-xl">Nuevo Egreso</SheetTitle>
          <SheetDescription>
            Registra un nuevo gasto financiero
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-8 py-6 flex flex-col">
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Location ID (only shown when not provided by session) */}
          {!locationId && (
            <div className="space-y-2 mb-4">
              <Label htmlFor="locationId">ID de Sucursal</Label>
              <Input
                id="locationId"
                type="text"
                placeholder="UUID de la sucursal"
                {...register('locationId')}
              />
              {errors.locationId && (
                <p className="text-destructive text-xs">{errors.locationId.message}</p>
              )}
            </div>
          )}

          {/* Date */}
          <div className="space-y-2 mb-4">
            <Label htmlFor="date">Fecha</Label>
            <Input
              id="date"
              type="date"
              {...register('date')}
            />
            {errors.date && (
              <p className="text-destructive text-xs">{errors.date.message}</p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-2 mb-4">
            <Label htmlFor="type">Tipo de Egreso</Label>
            <select
              id="type"
              {...register('type')}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
            >
              {EXPENSE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {errors.type && (
              <p className="text-destructive text-xs">{errors.type.message}</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2 mb-4">
            <Label htmlFor="amount">Monto</Label>
            <Input
              id="amount"
              type="text"
              placeholder="0.00"
              {...register('amount')}
            />
            {errors.amount && (
              <p className="text-destructive text-xs">{errors.amount.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2 mb-6">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <textarea
              id="description"
              placeholder="Detalles adicionales..."
              maxLength={500}
              rows={3}
              {...register('description')}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            {errors.description && (
              <p className="text-destructive text-xs">{errors.description.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="mt-auto flex gap-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Creando...' : 'Crear Egreso'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
