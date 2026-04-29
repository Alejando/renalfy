'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { PurchaseOrderDetailResponse, ReceivePurchaseOrderDto } from '@repo/types';
import { ReceivePurchaseOrderSchema } from '@repo/types';
import { receivePurchaseAction } from '@/app/actions/purchases';
import { Button } from '@/components/ui/button';

interface ReceiveItemsFormProps {
  order: PurchaseOrderDetailResponse;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReceiveItemsForm({ order, onClose, onSuccess }: ReceiveItemsFormProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string>('');

  const form = useForm<ReceivePurchaseOrderDto>({
    resolver: zodResolver(ReceivePurchaseOrderSchema),
    defaultValues: {
      purchaseOrderId: order.id,
      locationId: order.location.id,
      items: order.items.map((item) => ({
        purchaseOrderItemId: item.id,
        productId: item.productId,
        quantityReceived: 1,
        unitsPerPackage: item.unitsPerPackage,
        unitPrice: item.unitPrice,
        tax: item.tax,
      })),
      notes: '',
    },
  });

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = form;

  const itemValues = watch('items');

  const onSubmit = async (values: ReceivePurchaseOrderDto) => {
    setErrorMessage('');

    const formData = new FormData();
    formData.append('purchaseOrderId', values.purchaseOrderId);
    formData.append('locationId', values.locationId);
    formData.append('items', JSON.stringify(values.items));
    if (values.notes) {
      formData.append('notes', values.notes);
    }

    const result = await receivePurchaseAction(null, formData);

    if (result?.error) {
      setErrorMessage(result.error);
      if (result.error.includes('Orden modificada')) {
        // Show conflict state - handled by the error message
      }
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {errorMessage && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage}
            {errorMessage.includes('Orden modificada') && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  router.refresh();
                }}
                className="mt-3 w-full"
              >
                Cerrar y Actualizar
              </Button>
            )}
          </div>
        )}

        {order.items.map((item, idx) => (
          <div key={item.id} className="space-y-4 rounded-lg border p-4">
            <div className="text-sm font-medium">{item.product.name}</div>

            <div>
              <label htmlFor={`quantityReceived-${idx}`} className="text-sm font-medium">
                Cantidad Recibida
              </label>
              <input
                {...register(`items.${idx}.quantityReceived`, {
                  setValueAs: (v) => (v === '' ? 0 : Number(v)),
                })}
                type="number"
                id={`quantityReceived-${idx}`}
                min="1"
                max={item.quantity}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              {errors.items?.[idx]?.quantityReceived && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.items[idx]?.quantityReceived?.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor={`unitsPerPackage-${idx}`} className="text-sm font-medium">
                Unidades por Empaque
              </label>
              <input
                {...register(`items.${idx}.unitsPerPackage`, {
                  setValueAs: (v) => (v === '' ? 0 : Number(v)),
                })}
                type="number"
                id={`unitsPerPackage-${idx}`}
                min="1"
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              {errors.items?.[idx]?.unitsPerPackage && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.items[idx]?.unitsPerPackage?.message}
                </p>
              )}
            </div>

            {itemValues?.[idx] && (
              <div className="rounded bg-muted p-2 text-sm">
                Delta de Stock:{' '}
                <span className="font-semibold">
                  {(itemValues[idx].quantityReceived * itemValues[idx].unitsPerPackage).toLocaleString('es-MX')}
                </span>{' '}
                unidades
              </div>
            )}
          </div>
        ))}

        <div>
          <label htmlFor="notes" className="text-sm font-medium">
            Notas (opcional)
          </label>
          <textarea
            {...register('notes')}
            id="notes"
            placeholder="Agregar notas sobre la recepción..."
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            rows={3}
          />
        </div>
      </div>

      <div className="flex gap-2 border-t px-6 py-4">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="gradient"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? 'Registrando…' : 'Recibir Artículos'}
        </Button>
      </div>
    </form>
  );
}
