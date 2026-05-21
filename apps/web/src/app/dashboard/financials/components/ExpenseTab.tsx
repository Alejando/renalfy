'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFinancialStore } from '../store/financial-store';
import { useExpenses, useCancelExpense } from '../hooks/useExpenses';
import { FinancialFilters } from './filters/FinancialFilters';
import { ExpenseTable } from './tables/ExpenseTable';
import { CreateExpenseModal } from './modals/CreateExpenseModal';
import { FinancialKpiCard } from './FinancialKpiCard';
import { formatCurrency } from '@/lib/formatters';

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

  const today = new Date().toISOString().split('T')[0];
  const totalAmount = expenses.reduce((sum: number, e: { amount?: string | number }) => sum + parseFloat(String(e.amount ?? 0)), 0);
  const todayCount = expenses.filter((e: { date?: string; createdAt?: string }) => (e.date ?? e.createdAt ?? '').startsWith(today ?? '')).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button variant="gradient" onClick={handleCreateClick}>Nuevo Egreso</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FinancialKpiCard
          label="Total del Período"
          value={formatCurrency(totalAmount)}
        />
        <FinancialKpiCard
          label="Egresos Hoy"
          value={String(todayCount)}
          subtext="transacciones"
        />
        <FinancialKpiCard
          label="Total Registros"
          value={String(expenses.length)}
        />
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
