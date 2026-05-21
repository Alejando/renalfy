'use client';

import React, { useCallback, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateSale } from '../../hooks/useSales.js';

interface CreateSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAYMENT_TYPES = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CREDIT', label: 'Crédito' },
  { value: 'DEBIT', label: 'Débito' },
  { value: 'TRANSFER', label: 'Transferencia' },
] as const;

const CreateSaleFormSchema = z.object({
  clientId: z.string().uuid('Cliente es requerido'),
  items: z
    .array(
      z.object({
        productId: z.string().uuid('Producto es requerido'),
        quantity: z.number().int().positive('Cantidad debe ser mayor a 0'),
        unitPrice: z
          .string()
          .regex(/^\d+(\.\d{1,2})?$/, 'Formato de precio inválido'),
      })
    )
    .min(1, 'Debe agregar al menos un producto'),
  paymentType: z.enum(['CASH', 'CREDIT', 'DEBIT', 'TRANSFER'] as const),
  notes: z.string().max(500).optional(),
});

type CreateSaleFormDto = z.infer<typeof CreateSaleFormSchema>;

export function CreateSaleModal({
  open,
  onOpenChange,
}: CreateSaleModalProps) {
  const createSaleMutation = useCreateSale();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateSaleFormDto>({
    resolver: zodResolver(CreateSaleFormSchema),
    defaultValues: {
      clientId: '',
      items: [{ productId: '', quantity: 1, unitPrice: '' }],
      paymentType: 'CASH',
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const onSubmit = useCallback(
    (data: CreateSaleFormDto) => {
      setErrorMessage(null);
      setSuccessMessage(null);
      createSaleMutation.mutate(
        {
          clientId: data.clientId,
          items: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unitPrice),
          })),
          paymentType: data.paymentType,
        },
        {
          onSuccess: () => {
            setSuccessMessage('Venta creada exitosamente');
            reset();
            setTimeout(() => {
              onOpenChange(false);
            }, 1500);
          },
          onError: (error) => {
            const message =
              error instanceof Error ? error.message : 'Error al crear la venta';
            setErrorMessage(message);
          },
        }
      );
    },
    [createSaleMutation, onOpenChange, reset]
  );

  const handleAddProduct = () => {
    append({ productId: '', quantity: 1, unitPrice: '' });
  };

  const handleRemoveProduct = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const watchedItems = watch('items');
  const runningTotal = (watchedItems ?? []).reduce((sum, item) => {
    const qty = Number(item?.quantity) || 0;
    const price = parseFloat(item?.unitPrice ?? '0') || 0;
    return sum + qty * price;
  }, 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-[12px] bg-black/30 flex items-center justify-center">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface-container-lowest px-6 pb-4 pt-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Nueva Venta</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-green-100 text-green-700 rounded-lg">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Client Select */}
          <div>
            <Label htmlFor="clientId" className="text-sm font-medium">
              Cliente
            </Label>
            <Input
              id="clientId"
              type="text"
              placeholder="Selecciona un cliente"
              {...register('clientId')}
              className="mt-2"
            />
            {errors.clientId && (
              <p className="text-red-500 text-sm mt-1">
                {errors.clientId.message}
              </p>
            )}
          </div>

          {/* Payment Method Select */}
          <div>
            <Label htmlFor="paymentType" className="text-sm font-medium">
              Método de pago
            </Label>
            <select
              id="paymentType"
              {...register('paymentType')}
              className="w-full mt-2 px-3 py-2 bg-surface-container rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {PAYMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.paymentType && (
              <p className="text-red-500 text-sm mt-1">
                {errors.paymentType.message}
              </p>
            )}
          </div>

          {/* Products Array */}
          <div>
            <Label className="text-sm font-medium">Productos</Label>
            <div className="mt-4 space-y-2">
              {/* Products table header */}
              <div className="grid grid-cols-[1fr_80px_100px_40px] gap-2 px-2">
                <p className="text-xs font-medium text-secondary">Producto (ID)</p>
                <p className="text-xs font-medium text-secondary">Cantidad</p>
                <p className="text-xs font-medium text-secondary">Precio Unit.</p>
                <span />
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[1fr_80px_100px_40px] gap-2 items-start bg-surface-container rounded-xl p-2">
                  <div>
                    <Input
                      type="text"
                      placeholder="ID del producto"
                      {...register(`items.${index}.productId`)}
                      className="h-8 text-sm"
                    />
                    {errors.items?.[index]?.productId && (
                      <p className="text-red-600 text-xs mt-0.5">{errors.items[index]?.productId?.message}</p>
                    )}
                  </div>
                  <div>
                    <Input
                      type="number"
                      placeholder="0"
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      className="h-8 text-sm"
                    />
                    {errors.items?.[index]?.quantity && (
                      <p className="text-red-600 text-xs mt-0.5">{errors.items[index]?.quantity?.message}</p>
                    )}
                  </div>
                  <div>
                    <Input
                      type="text"
                      placeholder="0.00"
                      {...register(`items.${index}.unitPrice`)}
                      className="h-8 text-sm"
                    />
                    {errors.items?.[index]?.unitPrice && (
                      <p className="text-red-600 text-xs mt-0.5">{errors.items[index]?.unitPrice?.message}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveProduct(index)}
                    disabled={fields.length === 1}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-secondary hover:text-red-600 hover:bg-red-50 disabled:opacity-0 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {errors.items && typeof errors.items === 'object' && 'message' in errors.items && (
                <p className="text-red-500 text-sm">
                  {errors.items.message}
                </p>
              )}

              {runningTotal > 0 && (
                <div className="flex items-center justify-end mt-3 px-2">
                  <p className="text-sm text-secondary mr-2">Subtotal:</p>
                  <p className="text-lg font-bold text-on-surface font-headline">
                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(runningTotal)}
                  </p>
                </div>
              )}
            </div>

            {/* Add Product Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleAddProduct}
              className="mt-4"
            >
              + Agregar producto
            </Button>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-sm font-medium">
              Notas (opcional)
            </Label>
            <Input
              id="notes"
              type="text"
              placeholder="Agregar notas sobre la venta"
              {...register('notes')}
              className="mt-2"
            />
            {errors.notes && (
              <p className="text-red-500 text-sm mt-1">
                {errors.notes.message}
              </p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createSaleMutation.isPending}
            >
              {isSubmitting || createSaleMutation.isPending
                ? 'Creando...'
                : 'Crear venta'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
