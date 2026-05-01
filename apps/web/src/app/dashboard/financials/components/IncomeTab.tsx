'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFinancialStore } from '../store/financial-store';
import { useIncomes, useCancelIncome } from '../hooks/useIncomes';
import { FinancialFilters } from './filters/FinancialFilters';
import { IncomeTable } from './tables/IncomeTable';
import { CreateIncomeModal } from './modals/CreateIncomeModal';

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Ingresos</h2>
        <Button onClick={handleCreateClick}>Crear Ingreso</Button>
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
