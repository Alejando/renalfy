'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFinancialStore } from '../store/financial-store';
import { useSales, useCancelSale } from '../hooks/useSales';
import { FinancialFilters } from './filters/FinancialFilters';
import { SalesTable } from './tables/SalesTable';
import { CreateSaleModal } from './modals/CreateSaleModal';
import { FinancialKpiCard } from './FinancialKpiCard';
import { formatCurrency } from '@/lib/formatters';

interface SalesFilters {
  dateFrom?: string;
  dateTo?: string;
  clientId?: string;
}

export function SalesTab() {
  const { openModal, openCreateModal, openDetailModal, closeModal } =
    useFinancialStore();

  const [filters, setFilters] = useState<SalesFilters>({});
  const { data: salesData, isLoading } = useSales(filters);
  const cancelSaleMutation = useCancelSale();

  const sales = Array.isArray(salesData) ? salesData : salesData?.data || [];

  const handleCreateClick = () => {
    openCreateModal('create-sale');
  };

  const handleFilterChange = (newFilters: SalesFilters) => {
    setFilters(newFilters);
  };

  const handleDetails = (id: string) => {
    openDetailModal(id);
  };

  const handleCancel = (id: string) => {
    if (
      confirm(
        'Are you sure you want to cancel this sale? This action cannot be undone.'
      )
    ) {
      cancelSaleMutation.mutate(id, {
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
  const totalAmount = sales.reduce((sum: number, s: { total?: number }) => sum + (s.total ?? 0), 0);
  const todayCount = sales.filter((s: { date?: string; createdAt?: string }) => (s.date ?? s.createdAt ?? '').startsWith(today ?? '')).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button variant="gradient" onClick={handleCreateClick}>Nueva Venta</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FinancialKpiCard
          label="Total del Período"
          value={formatCurrency(totalAmount)}
        />
        <FinancialKpiCard
          label="Ventas Hoy"
          value={String(todayCount)}
          subtext="transacciones"
        />
        <FinancialKpiCard
          label="Total Registros"
          value={String(sales.length)}
        />
      </div>

      <FinancialFilters
        onFilter={handleFilterChange}
        filterType="sales"
      />

      <SalesTable
        sales={sales}
        isLoading={isLoading}
        onDetails={handleDetails}
        onCancel={handleCancel}
      />

      <CreateSaleModal
        open={openModal === 'create-sale'}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      />
    </div>
  );
}
