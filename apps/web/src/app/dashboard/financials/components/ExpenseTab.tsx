'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFinancialStore } from '../store/financial-store';
import { useExpenses, useCancelExpense } from '../hooks/useExpenses';
import { FinancialFilters } from './filters/FinancialFilters';
import { ExpenseTable } from './tables/ExpenseTable';
import { CreateExpenseModal } from './modals/CreateExpenseModal';

interface ExpenseFilters {
  dateFrom?: string;
  dateTo?: string;
  type?: string;
}

export function ExpenseTab() {
  const { openModal, openCreateModal, openDetailModal, closeModal } =
    useFinancialStore();

  const [filters, setFilters] = useState<ExpenseFilters>({});
  const { data: expensesData, isLoading } = useExpenses(filters);
  const cancelExpenseMutation = useCancelExpense();

  const expenses = Array.isArray(expensesData) ? expensesData : expensesData?.data || [];

  const handleCreateClick = () => {
    openCreateModal('create-expense');
  };

  const handleFilterChange = (newFilters: ExpenseFilters) => {
    setFilters(newFilters);
  };

  const handleDetails = (id: string) => {
    openDetailModal(id);
  };

  const handleCancel = (id: string) => {
    if (
      confirm(
        'Are you sure you want to cancel this expense? This action cannot be undone.'
      )
    ) {
      cancelExpenseMutation.mutate(id, {
        onSuccess: () => {
          closeModal();
        },
        onError: () => {
          // Error is handled by the query client
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Egresos</h2>
        <Button onClick={handleCreateClick}>Crear Egreso</Button>
      </div>

      <FinancialFilters
        onFilter={handleFilterChange}
        filterType="expense"
      />

      <ExpenseTable
        expenses={expenses}
        isLoading={isLoading}
        onDetails={handleDetails}
        onCancel={handleCancel}
      />

      <CreateExpenseModal
        open={openModal === 'create-expense'}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      />
    </div>
  );
}
