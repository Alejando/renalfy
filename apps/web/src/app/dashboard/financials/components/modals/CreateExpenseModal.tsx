'use client';

import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Label } from '@/components/ui/label.js';
import { Textarea } from '@/components/ui/textarea.js';
import { useCreateExpense } from '../../hooks/useExpenses.js';

interface CreateExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EXPENSE_TYPES = [
  { value: 'SUPPLIES', label: 'Suministros' },
  { value: 'UTILITIES', label: 'Servicios Públicos' },
  { value: 'STAFF', label: 'Personal' },
  { value: 'OTHER', label: 'Otro' },
] as const;

const CreateExpenseFormSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
  type: z.enum(['SUPPLIES', 'UTILITIES', 'STAFF', 'OTHER'] as const),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Monto debe ser un número válido')
    .refine((val) => parseFloat(val) > 0, 'Monto debe ser mayor a 0'),
  description: z.string().max(500).optional(),
});

type CreateExpenseFormDto = z.infer<typeof CreateExpenseFormSchema>;

export function CreateExpenseModal({
  open,
  onOpenChange,
}: CreateExpenseModalProps) {
  const createExpenseMutation = useCreateExpense();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateExpenseFormDto>({
    resolver: zodResolver(CreateExpenseFormSchema),
    mode: 'onBlur',
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      type: 'SUPPLIES',
      amount: '',
      description: '',
    },
  });

  const onSubmit = useCallback(
    (data: CreateExpenseFormDto) => {
      setErrorMessage(null);
      setSuccessMessage(null);

      createExpenseMutation.mutate(
        {
          date: data.date,
          type: data.type as 'SUPPLIES' | 'UTILITIES' | 'STAFF' | 'OTHER',
          amount: parseFloat(data.amount),
          description: data.description || '',
        },
        {
          onSuccess: () => {
            setSuccessMessage('Gasto creado exitosamente');
            reset();
            setTimeout(() => {
              onOpenChange(false);
            }, 1500);
          },
          onError: (error) => {
            const message =
              error instanceof Error ? error.message : 'Error al crear el gasto';
            setErrorMessage(message);
          },
        }
      );
    },
    [createExpenseMutation, onOpenChange, reset]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Nuevo Gasto</h2>
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
          {/* Date */}
          <div>
            <Label htmlFor="date" className="text-sm font-medium">
              Fecha
            </Label>
            <Input
              id="date"
              type="date"
              {...register('date')}
              className="mt-2"
            />
            {errors.date && (
              <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
            )}
          </div>

          {/* Type */}
          <div>
            <Label htmlFor="type" className="text-sm font-medium">
              Tipo de Gasto
            </Label>
            <select
              id="type"
              {...register('type')}
              className="w-full mt-2 px-3 py-2 border rounded-md"
            >
              {EXPENSE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.type && (
              <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <Label htmlFor="amount" className="text-sm font-medium">
              Monto
            </Label>
            <Input
              id="amount"
              type="text"
              placeholder="0.00"
              {...register('amount')}
              className="mt-2"
            />
            {errors.amount && (
              <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Descripción (opcional)
            </Label>
            <Textarea
              id="description"
              placeholder="Agregar notas sobre el gasto"
              {...register('description')}
              className="mt-2"
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">
                {errors.description.message}
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
              disabled={isSubmitting || createExpenseMutation.isPending}
            >
              {isSubmitting || createExpenseMutation.isPending
                ? 'Creando...'
                : 'Crear gasto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
