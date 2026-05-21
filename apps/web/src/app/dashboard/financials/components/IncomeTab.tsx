'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFinancialStore } from '../store/financial-store';
import { useIncomes, useCancelIncome } from '../hooks/useIncomes';
import { FinancialFilters } from './filters/FinancialFilters';
import { IncomeTable } from './tables/IncomeTable';
import { CreateIncomeModal } from './modals/CreateIncomeModal';
import { FinancialKpiCard } from './FinancialKpiCard';
import { formatCurrency } from '@/lib/formatters';

interface IncomeFilters {
  dateFrom?: string;
  dateTo?: string;
  type?: string;
}

export function IncomeTab() {
  const { openModal, openCreateModal, openDetailModal, closeModal } =
    useFinancialStore();

  const [filters, setFilters] = useState<IncomeFilters>({});
  const { data: incomesData, isLoading } = useIncomes(filters);
  const cancelIncomeMutation = useCancelIncome();

  const incomes = Array.isArray(incomesData) ? incomesData : incomesData?.data || [];

  const handleCreateClick = () => {
    openCreateModal('create-income');
  };

  const handleFilterChange = (newFilters: IncomeFilters) => {
    setFilters(newFilters);
  };

  const handleDetails = (id: string) => {
    openDetailModal(id);
  };

  const handleCancel = (id: string) => {
    if (
      confirm(
        'Are you sure you want to cancel this income? This action cannot be undone.'
      )
    ) {
      cancelIncomeMutation.mutate(id, {
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
  const totalAmount = incomes.reduce((sum: number, i: { amount?: string | number }) => sum + parseFloat(String(i.amount ?? 0)), 0);
  const todayCount = incomes.filter((i: { date?: string; createdAt?: string }) => (i.date ?? i.createdAt ?? '').startsWith(today ?? '')).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button variant="gradient" onClick={handleCreateClick}>Nuevo Ingreso</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FinancialKpiCard
          label="Total del Período"
          value={formatCurrency(totalAmount)}
        />
        <FinancialKpiCard
          label="Ingresos Hoy"
          value={String(todayCount)}
          subtext="transacciones"
        />
        <FinancialKpiCard
          label="Total Registros"
          value={String(incomes.length)}
        />
      </div>

      <FinancialFilters
        onFilter={handleFilterChange}
        filterType="income"
      />

      <IncomeTable
        incomes={incomes}
        isLoading={isLoading}
        onDetails={handleDetails}
        onCancel={handleCancel}
      />

      <CreateIncomeModal
        open={openModal === 'create-income'}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      />
    </div>
  );
}
