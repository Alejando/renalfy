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
import { createCashCloseAction } from '../../../../actions/financials';

const CreateCashCloseFormSchema = z.object({
  locationId: z.string().uuid('ID de sucursal inválido').optional(),
  date: z.string().min(1, 'Fecha es requerida'),
});

type CreateCashCloseFormData = z.infer<typeof CreateCashCloseFormSchema>;

interface CreateCashCloseDrawerProps {
  open: boolean;
  onClose: () => void;
  locationId?: string | null;
}

export function CreateCashCloseDrawer({ open, onClose, locationId }: CreateCashCloseDrawerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCashCloseFormData>({
    resolver: zodResolver(CreateCashCloseFormSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = useCallback(
    async (data: CreateCashCloseFormData) => {
      setError(null);
      setIsSubmitting(true);

      try {
        const result = await createCashCloseAction({
          date: data.date,
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
        setError(e instanceof Error ? e.message : 'Error al crear el corte de caja');
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
          <SheetTitle className="font-headline font-bold text-xl">Nuevo Corte de Caja</SheetTitle>
          <SheetDescription>
            Crear un nuevo corte de caja cerrará las transacciones del período
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
          <div className="space-y-2 mb-6">
            <Label htmlFor="date">Fecha del Corte</Label>
            <Input
              id="date"
              type="date"
              {...register('date')}
            />
            {errors.date && (
              <p className="text-destructive text-xs">{errors.date.message}</p>
            )}
          </div>

          {/* Warning Message */}
          <div className="mb-6 p-4 bg-yellow-100/50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              Advertencia: Cerrar la caja marcará todas las ventas, ingresos y egresos del período como cerrados y no podrán editarse.
            </p>
          </div>

          {/* Submit Button */}
          <div className="mt-auto flex gap-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Creando...' : 'Crear Corte'}
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
