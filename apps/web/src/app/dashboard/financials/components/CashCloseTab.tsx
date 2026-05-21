'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFinancialStore } from '../store/financial-store';
import { useCashCloses } from '../hooks/useCashCloses';
import { FinancialFilters } from './filters/FinancialFilters';
import { CashCloseTable } from './tables/CashCloseTable';
import { CreateCashCloseModal } from './modals/CreateCashCloseModal';
import { FinancialKpiCard } from './FinancialKpiCard';
import { formatCurrency } from '@/lib/formatters';

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

  type CashCloseItem = { totalSales?: number; totalIncomes?: number; totalExpenses?: number };
  const totalSales = cashCloses.reduce((sum: number, cc: CashCloseItem) => sum + (cc.totalSales ?? 0), 0);
  const totalIncomes = cashCloses.reduce((sum: number, cc: CashCloseItem) => sum + (cc.totalIncomes ?? 0), 0);
  const totalExpenses = cashCloses.reduce((sum: number, cc: CashCloseItem) => sum + (cc.totalExpenses ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button variant="gradient" onClick={handleCreateClick}>Nuevo Corte</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FinancialKpiCard
          label="Total Ventas Acum."
          value={formatCurrency(totalSales)}
        />
        <FinancialKpiCard
          label="Total Ingresos Acum."
          value={formatCurrency(totalIncomes)}
        />
        <FinancialKpiCard
          label="Total Egresos Acum."
          value={formatCurrency(totalExpenses)}
        />
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
