'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { LocationStockResponse } from '@repo/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { adjustStockQuantityAction } from '../../../../../actions/stock';

const FormSchema = z
  .object({
    adjustmentType: z.enum(['SET', 'DELTA']),
    quantity: z
      .string()
      .regex(/^\d+$/, 'Debe ser un número entero')
      .optional(),
    delta: z
      .string()
      .regex(/^-?\d+$/, 'Debe ser un número entero (negativo para decremento)')
      .optional(),
  })
  .refine(
    (data) => {
      if (data.adjustmentType === 'SET') {
        return data.quantity !== undefined && data.quantity !== '';
      }
      if (data.adjustmentType === 'DELTA') {
        return data.delta !== undefined && data.delta !== '' && data.delta !== '0';
      }
      return false;
    },
    {
      message: 'Ingresa un valor para el ajuste',
      path: ['quantity'],
    },
  );

type FormValues = z.infer<typeof FormSchema>;

interface AdjustQuantityDrawerProps {
  open: boolean;
  stockEntry: LocationStockResponse | null;
  onClose: () => void;
  onSuccess: () => void;
}

const LABEL_CLASS =
  'block text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

const RADIO_CLASS = 'flex items-center gap-3 p-3 rounded-lg border border-border';

export function AdjustQuantityDrawer({
  open,
  stockEntry,
  onClose,
  onSuccess,
}: AdjustQuantityDrawerProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      adjustmentType: 'SET',
      quantity: '',
      delta: '',
    },
  });

  const adjustmentType = watch('adjustmentType');

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      reset();
      onClose();
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!stockEntry) return;
    setServerError(null);

    const formData = new FormData();
    formData.append('id', stockEntry.id);
    formData.append('adjustmentType', data.adjustmentType);
    if (data.adjustmentType === 'SET' && data.quantity) {
      formData.append('quantity', data.quantity);
    } else if (data.adjustmentType === 'DELTA' && data.delta) {
      formData.append('delta', data.delta);
    }

    const result = await adjustStockQuantityAction(null, formData);
    if (result?.error) {
      setServerError(result.error);
      return;
    }

    reset();
    onSuccess();
    router.refresh();
  };

  if (!stockEntry) {
    return null;
  }

  const projectedQuantity =
    adjustmentType === 'SET'
      ? (() => {
          const qty = watch('quantity');
          return qty ? parseInt(qty, 10) : stockEntry.quantity;
        })()
      : (() => {
          const delta = watch('delta');
          return delta ? stockEntry.quantity + parseInt(delta, 10) : stockEntry.quantity;
        })();

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full max-w-md flex flex-col p-0">
        <SheetHeader className="px-8 py-6 bg-muted">
          <SheetTitle className="font-headline font-bold text-xl">
            Ajustar Cantidad
          </SheetTitle>
          <SheetDescription>
            Modifica el stock de <strong>{stockEntry.productName}</strong> en{' '}
            {stockEntry.locationName ?? stockEntry.locationId}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Current stock info */}
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Stock actual: <span className="text-foreground font-semibold">{stockEntry.quantity}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Nivel de alerta:{' '}
              <span className="text-foreground font-semibold">
                {stockEntry.effectiveAlertLevel > 0
                  ? stockEntry.effectiveAlertLevel.toString()
                  : 'Sin alerta'}
              </span>
            </p>
          </div>

          {serverError && (
            <div className="mb-4 p-3 bg-destructive/10 rounded-lg">
              <p className="text-destructive text-sm font-medium">{serverError}</p>
            </div>
          )}

          <form
            aria-label="Ajustar cantidad de stock"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
          >
            {/* Adjustment type */}
            <div className="space-y-2">
              <Label className={LABEL_CLASS}>Tipo de Ajuste</Label>
              <div className="space-y-2">
                <label className={RADIO_CLASS}>
                  <input
                    type="radio"
                    value="SET"
                    {...register('adjustmentType')}
                    className="accent-primary"
                  />
                  <div>
                    <p className="text-foreground text-sm font-medium">Valor exacto</p>
                    <p className="text-muted-foreground text-xs">
                      Establece la cantidad exacta de stock
                    </p>
                  </div>
                </label>
                <label className={RADIO_CLASS}>
                  <input
                    type="radio"
                    value="DELTA"
                    {...register('adjustmentType')}
                    className="accent-primary"
                  />
                  <div>
                    <p className="text-foreground text-sm font-medium">Incremento/Decremento</p>
                    <p className="text-muted-foreground text-xs">
                      Suma o resta unidades del stock actual
                    </p>
                  </div>
                </label>
              </div>
              {errors.adjustmentType && (
                <p className="text-sm text-destructive">{errors.adjustmentType.message}</p>
              )}
            </div>

            {/* Quantity input */}
            {adjustmentType === 'SET' && (
              <div className="space-y-2">
                <Label htmlFor="adjust-quantity" className={LABEL_CLASS}>
                  Cantidad exacta <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="adjust-quantity"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0"
                  {...register('quantity')}
                />
                {errors.quantity && (
                  <p className="text-sm text-destructive">{errors.quantity.message}</p>
                )}
              </div>
            )}

            {adjustmentType === 'DELTA' && (
              <div className="space-y-2">
                <Label htmlFor="adjust-delta" className={LABEL_CLASS}>
                  Incremento/Decremento <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="adjust-delta"
                  type="number"
                  step={1}
                  placeholder="Ej: 5 o -3"
                  {...register('delta')}
                />
                {errors.delta && (
                  <p className="text-sm text-destructive">{errors.delta.message}</p>
                )}
              </div>
            )}

            {/* Projected quantity */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Stock proyectado:{' '}
                <span
                  className={`font-semibold ${
                    projectedQuantity < 0 ? 'text-destructive' : 'text-foreground'
                  }`}
                >
                  {projectedQuantity}
                </span>
              </p>
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
                {isSubmitting ? 'Ajustando…' : 'Ajustar'}
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
