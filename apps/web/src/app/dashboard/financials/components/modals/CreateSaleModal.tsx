'use client';

import React, { useCallback, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Label } from '@/components/ui/label.js';
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Nueva Venta</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
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
              className="w-full mt-2 px-3 py-2 border rounded-md"
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
            <div className="mt-4 space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="border rounded-lg p-4 space-y-3 bg-gray-50"
                >
                  {/* Product Select */}
                  <div>
                    <Label
                      htmlFor={`items.${index}.productId`}
                      className="text-xs font-medium"
                    >
                      Producto
                    </Label>
                    <Input
                      id={`items.${index}.productId`}
                      type="text"
                      placeholder="ID del producto"
                      {...register(`items.${index}.productId`)}
                      className="mt-1"
                    />
                    {errors.items?.[index]?.productId && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.items[index]?.productId?.message}
                      </p>
                    )}
                  </div>

                  {/* Quantity */}
                  <div>
                    <Label
                      htmlFor={`items.${index}.quantity`}
                      className="text-xs font-medium"
                    >
                      Cantidad
                    </Label>
                    <Input
                      id={`items.${index}.quantity`}
                      type="number"
                      placeholder="0"
                      {...register(`items.${index}.quantity`, {
                        valueAsNumber: true,
                      })}
                      className="mt-1"
                    />
                    {errors.items?.[index]?.quantity && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.items[index]?.quantity?.message}
                      </p>
                    )}
                  </div>

                  {/* Unit Price */}
                  <div>
                    <Label
                      htmlFor={`items.${index}.unitPrice`}
                      className="text-xs font-medium"
                    >
                      Precio unitario
                    </Label>
                    <Input
                      id={`items.${index}.unitPrice`}
                      type="text"
                      placeholder="0.00"
                      {...register(`items.${index}.unitPrice`)}
                      className="mt-1"
                    />
                    {errors.items?.[index]?.unitPrice && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.items[index]?.unitPrice?.message}
                      </p>
                    )}
                  </div>

                  {/* Remove Button */}
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveProduct(index)}
                    >
                      Quitar
                    </Button>
                  )}
                </div>
              ))}

              {errors.items && typeof errors.items === 'object' && 'message' in errors.items && (
                <p className="text-red-500 text-sm">
                  {errors.items.message}
                </p>
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
          <div className="flex gap-3 justify-end border-t pt-6">
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
