'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Label } from '@/components/ui/label.js';
import { useCreateCashClose } from '../../hooks/useCashCloses.js';
import { useSales } from '../../hooks/useSales.js';
import { useIncomes } from '../../hooks/useIncomes.js';
import { useExpenses } from '../../hooks/useExpenses.js';
import { useCashCloses } from '../../hooks/useCashCloses.js';
import { formatCurrency } from '@/lib/formatters.js';

interface CreateCashCloseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateCashCloseFormSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
});

type CreateCashCloseFormDto = z.infer<typeof CreateCashCloseFormSchema>;

export function CreateCashCloseModal({
  open,
  onOpenChange,
}: CreateCashCloseModalProps) {
  const createCashCloseMutation = useCreateCashClose();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateCashCloseFormDto>({
    resolver: zodResolver(CreateCashCloseFormSchema),
    mode: 'onBlur',
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
    },
  });

  const selectedDateStr = watch('date');

  // Fetch data for period summary
  const salesData = useSales({
    dateFrom: selectedDateStr,
    dateTo: selectedDateStr,
  });

  const incomesData = useIncomes({
    dateFrom: selectedDateStr,
    dateTo: selectedDateStr,
  });

  const expensesData = useExpenses({
    dateFrom: selectedDateStr,
    dateTo: selectedDateStr,
  });

  const cashClosesData = useCashCloses({
    dateTo: selectedDateStr,
  });

  // Calculate period summary
  const summary = useMemo(() => {
    const selectedDateForCalc = new Date(selectedDateStr);

    let salesTotal = 0;
    let incomesTotal = 0;
    let expensesTotal = 0;
    let periodStart = new Date(selectedDateForCalc);

    // If sales data exists, sum the totals
    if (salesData.data && Array.isArray(salesData.data.data || salesData.data)) {
      const sales = Array.isArray(salesData.data.data) ? salesData.data.data : salesData.data;
      salesTotal = sales.reduce((sum: number, sale: Record<string, unknown>) => {
        const amount = typeof sale.total === 'string' ? parseFloat(sale.total as string) : (sale.total as number);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
    }

    // If incomes data exists, sum the totals
    if (incomesData.data && Array.isArray(incomesData.data.data || incomesData.data)) {
      const incomes = Array.isArray(incomesData.data.data) ? incomesData.data.data : incomesData.data;
      incomesTotal = incomes.reduce((sum: number, income: Record<string, unknown>) => {
        const amount = typeof income.amount === 'string' ? parseFloat(income.amount as string) : (income.amount as number);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
    }

    // If expenses data exists, sum the totals
    if (expensesData.data && Array.isArray(expensesData.data.data || expensesData.data)) {
      const expenses = Array.isArray(expensesData.data.data) ? expensesData.data.data : expensesData.data;
      expensesTotal = expenses.reduce((sum: number, expense: Record<string, unknown>) => {
        const amount = typeof expense.amount === 'string' ? parseFloat(expense.amount as string) : (expense.amount as number);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
    }

    // Find the last cash close date
    if (cashClosesData.data && Array.isArray(cashClosesData.data.data || cashClosesData.data)) {
      const closes = Array.isArray(cashClosesData.data.data) ? cashClosesData.data.data : cashClosesData.data;
      if (closes.length > 0) {
        const lastClose = closes[0];
        const lastCloseDate = new Date(lastClose.date || lastClose.closedAt);
        // Set period start to the day after the last close
        periodStart = new Date(lastCloseDate);
        periodStart.setDate(periodStart.getDate() + 1);
      }
    }

    const totalInCash = salesTotal + incomesTotal - expensesTotal;

    return {
      periodStart: periodStart.toISOString().split('T')[0],
      periodEnd: selectedDateStr,
      salesTotal,
      incomesTotal,
      expensesTotal,
      totalInCash,
    };
  }, [selectedDateStr, salesData.data, incomesData.data, expensesData.data, cashClosesData.data]);

  const onSubmit = useCallback(
    (data: CreateCashCloseFormDto) => {
      setErrorMessage(null);
      setSuccessMessage(null);

      createCashCloseMutation.mutate(
        {
          date: data.date,
        },
        {
          onSuccess: () => {
            setSuccessMessage('Corte de caja creado exitosamente');
            reset();
            setTimeout(() => {
              onOpenChange(false);
            }, 1500);
          },
          onError: (error) => {
            const message =
              error instanceof Error ? error.message : 'Error al crear el corte de caja';
            setErrorMessage(message);
          },
        }
      );
    },
    [createCashCloseMutation, onOpenChange, reset]
  );

  if (!open) return null;

  const isLoading = salesData.isLoading || incomesData.isLoading || expensesData.isLoading || cashClosesData.isLoading;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Nuevo Corte de Caja</h2>
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
              Fecha del Corte
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

          {/* Period Summary */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold text-sm mb-4">Resumen del Período</h3>

            {isLoading && (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">Cargando datos...</p>
              </div>
            )}

            {!isLoading && (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Período:</span>
                  <span className="font-medium">
                    {summary.periodStart} a {summary.periodEnd}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Ventas:</span>
                  <span className="font-medium">
                    {formatCurrency(summary.salesTotal)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Ingresos:</span>
                  <span className="font-medium">
                    {formatCurrency(summary.incomesTotal)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Egresos:</span>
                  <span className="font-medium">
                    {formatCurrency(summary.expensesTotal)}
                  </span>
                </div>

                <div className="border-t pt-3 flex justify-between">
                  <span className="font-semibold">Total en Caja:</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(summary.totalInCash)}
                  </span>
                </div>
              </div>
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
              disabled={isSubmitting || createCashCloseMutation.isPending || isLoading}
            >
              {isSubmitting || createCashCloseMutation.isPending
                ? 'Creando...'
                : 'Crear corte de caja'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
