'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { createSaleAction } from '../../../../actions/financials';

const CreateSaleFormSchema = z.object({
  clientId: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Producto es requerido'),
        quantity: z
          .number()
          .int()
          .positive('Cantidad debe ser mayor a 0'),
        unitPrice: z.number().positive('Precio debe ser mayor a 0'),
      })
    )
    .min(1, 'Debe agregar al menos un producto'),
  paymentType: z.enum(['CASH', 'CREDIT', 'DEBIT', 'TRANSFER', 'BENEFIT'] as const),
  notes: z.string().max(500).optional(),
});

type CreateSaleFormData = z.infer<typeof CreateSaleFormSchema>;

const PAYMENT_TYPES = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CREDIT', label: 'Crédito' },
  { value: 'DEBIT', label: 'Débito' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'BENEFIT', label: 'Beneficio' },
] as const;

interface CreateSaleDrawerProps {
  open: boolean;
  onClose: () => void;
  locationId?: string | null;
}

export function CreateSaleDrawer({ open, onClose, locationId }: CreateSaleDrawerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateSaleFormData>({
    resolver: zodResolver(CreateSaleFormSchema),
    defaultValues: {
      clientId: '',
      items: [{ productId: '', quantity: 1, unitPrice: 0 }],
      paymentType: 'CASH',
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');
  const runningTotal = (watchedItems ?? []).reduce((sum, item) => {
    const qty = item?.quantity || 0;
    const price = item?.unitPrice || 0;
    return sum + qty * price;
  }, 0);

  const onSubmit = useCallback(
    async (data: CreateSaleFormData) => {
      setError(null);
      setIsSubmitting(true);

      try {
        const result = await createSaleAction({
          locationId: locationId ?? '',
          clientId: data.clientId || undefined,
          items: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          paymentType: data.paymentType,
          notes: data.notes,
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
        setError(e instanceof Error ? e.message : 'Error al crear la venta');
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
      <SheetContent side="right" className="w-full max-w-md flex flex-col p-0 overflow-y-auto">
        <SheetHeader className="px-8 py-6 bg-muted">
          <SheetTitle className="font-headline font-bold text-xl">Nueva Venta</SheetTitle>
          <SheetDescription>
            Registra una nueva venta con productos
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-8 py-6">
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Client ID (Optional) */}
          <div className="space-y-2 mb-4">
            <Label htmlFor="clientId">Cliente (opcional)</Label>
            <Input
              id="clientId"
              type="text"
              placeholder="ID del cliente"
              {...register('clientId')}
            />
            {errors.clientId && (
              <p className="text-destructive text-xs">{errors.clientId.message}</p>
            )}
          </div>

          {/* Items Array */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <Label className="font-semibold">Productos</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ productId: '', quantity: 1, unitPrice: 0 })}
              >
                Agregar
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="mb-4 p-4 border border-border rounded-md">
                <div className="space-y-2 mb-2">
                  <Label htmlFor={`items.${index}.productId`} className="text-xs">
                    Producto
                  </Label>
                  <Input
                    id={`items.${index}.productId`}
                    type="text"
                    placeholder="ID del producto"
                    {...register(`items.${index}.productId`)}
                  />
                  {errors.items?.[index]?.productId && (
                    <p className="text-destructive text-xs">
                      {errors.items[index]?.productId?.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="space-y-2">
                    <Label htmlFor={`items.${index}.quantity`} className="text-xs">
                      Cantidad
                    </Label>
                    <Input
                      id={`items.${index}.quantity`}
                      type="number"
                      min="1"
                      {...register(`items.${index}.quantity`, {
                        valueAsNumber: true,
                      })}
                    />
                    {errors.items?.[index]?.quantity && (
                      <p className="text-destructive text-xs">
                        {errors.items[index]?.quantity?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`items.${index}.unitPrice`} className="text-xs">
                      Precio
                    </Label>
                    <Input
                      id={`items.${index}.unitPrice`}
                      type="number"
                      min="0"
                      step="0.01"
                      {...register(`items.${index}.unitPrice`, {
                        valueAsNumber: true,
                      })}
                    />
                    {errors.items?.[index]?.unitPrice && (
                      <p className="text-destructive text-xs">
                        {errors.items[index]?.unitPrice?.message}
                      </p>
                    )}
                  </div>
                </div>

                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(index)}
                    className="w-full text-xs"
                  >
                    Remover
                  </Button>
                )}
              </div>
            ))}

            {errors.items && typeof errors.items.message === 'string' && (
              <p className="text-destructive text-xs">{errors.items.message}</p>
            )}
          </div>

          {/* Running Total */}
          <div className="mb-6 p-3 bg-surface-container rounded-md">
            <p className="text-sm text-secondary">Total</p>
            <p className="text-2xl font-bold text-on-surface">
              ${runningTotal.toFixed(2)}
            </p>
          </div>

          {/* Payment Type */}
          <div className="space-y-2 mb-4">
            <Label htmlFor="paymentType">Tipo de Pago</Label>
            <select
              id="paymentType"
              {...register('paymentType')}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
            >
              {PAYMENT_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>
                  {pt.label}
                </option>
              ))}
            </select>
            {errors.paymentType && (
              <p className="text-destructive text-xs">{errors.paymentType.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2 mb-6">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <textarea
              id="notes"
              placeholder="Notas adicionales..."
              maxLength={500}
              rows={3}
              {...register('notes')}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            {errors.notes && (
              <p className="text-destructive text-xs">{errors.notes.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="mt-auto flex gap-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Creando...' : 'Crear Venta'}
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
