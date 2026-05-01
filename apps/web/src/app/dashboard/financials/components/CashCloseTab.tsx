'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button.js';
import { useFinancialStore } from '../store/financial-store.js';
import { useCashCloses } from '../hooks/useCashCloses.js';
import { FinancialFilters } from './filters/FinancialFilters.js';
import { CashCloseTable } from './tables/CashCloseTable.js';
import { CreateCashCloseModal } from './modals/CreateCashCloseModal.js';

interface CashCloseFilters {
  dateFrom?: string;
  dateTo?: string;
}

export function CashCloseTab() {
  const { openModal, openCreateModal, openDetailModal, closeModal } =
    useFinancialStore();

  const [filters, setFilters] = useState<CashCloseFilters>({});
  const { data: cashClosesData, isLoading } = useCashCloses(filters);

  const cashCloses = Array.isArray(cashClosesData)
    ? cashClosesData
    : cashClosesData?.data || [];

  const handleCreateClick = () => {
    openCreateModal('create-cashClose');
  };

  const handleFilterChange = (newFilters: CashCloseFilters) => {
    setFilters(newFilters);
  };

  const handleDetails = (id: string) => {
    openDetailModal(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Cortes de Caja</h2>
        <Button onClick={handleCreateClick}>Crear Corte</Button>
      </div>

      <FinancialFilters
        onFilter={handleFilterChange}
        filterType="sales"
      />

      <CashCloseTable
        cashCloses={cashCloses}
        isLoading={isLoading}
        onDetails={handleDetails}
      />

      <CreateCashCloseModal
        open={openModal === 'create-cashClose'}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      />
    </div>
  );
}
