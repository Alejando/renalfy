'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { UserRole } from '@repo/types';
import { Button } from '@/components/ui/button';
import { SalesTable } from '@/src/app/dashboard/financials/components/tables/SalesTable';
import { FinancialKpiCard } from '@/src/app/dashboard/financials/components/FinancialKpiCard';
import { CreateSaleDrawer } from './create-sale-drawer';
import { formatCurrency } from '@/lib/formatters';

interface SaleItem {
  id: string;
  folio: string;
  totalAmount: string;
  paymentType: string;
  status: 'ACTIVE' | 'CANCELLED' | 'FINISHED' | 'SETTLED';
  notes: string | null;
  createdAt: string;
  items: Array<{ productId: string; quantity: number; [key: string]: unknown }>;
  locationId: string;
}

interface SalesTabViewProps {
  sales: SaleItem[];
  userRole: UserRole;
  locationId?: string | null;
  dateFrom?: string;
  dateTo?: string;
}

export function SalesTabView({
  sales,
  userRole,
  locationId,
  dateFrom,
  dateTo,
}: SalesTabViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const total = sales.reduce((sum, s) => sum + parseFloat(s.totalAmount || '0'), 0);
    const activeSales = sales.filter((s) => s.status === 'ACTIVE').length;
    const completedSales = sales.filter((s) => s.status === 'SETTLED').length;

    return {
      total,
      activeSales,
      completedSales,
    };
  }, [sales]);

  // Filter chip handlers
  const handleFilterChip = (from: string, to: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (dateFrom === from && dateTo === to) {
      // Clear filters if clicking active chip
      params.delete('dateFrom');
      params.delete('dateTo');
    } else {
      params.set('dateFrom', from);
      params.set('dateTo', to);
    }
    params.set('tab', 'sales');
    router.push(`?${params.toString()}`);
  };

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split('T')[0]!;
  const todayStr = today.toISOString().split('T')[0]!;

  const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    .toISOString()
    .split('T')[0]!;
  const lastOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
    .toISOString()
    .split('T')[0]!;

  const firstOfYear = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]!;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FinancialKpiCard
          label="Total de Ventas"
          value={formatCurrency(kpis.total)}
          subtext={`${sales.length} registros`}
        />
        <FinancialKpiCard
          label="Ventas Activas"
          value={kpis.activeSales.toString()}
          subtext="En proceso"
        />
        <FinancialKpiCard
          label="Ventas Liquidadas"
          value={kpis.completedSales.toString()}
          subtext="Completadas"
        />
      </div>

      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ventas</h2>
        <Button
          variant="gradient"
          onClick={() => setDrawerOpen(true)}
          disabled={userRole === 'STAFF'}
        >
          Nueva Venta
        </Button>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => handleFilterChip(firstOfMonth, todayStr)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            dateFrom === firstOfMonth && dateTo === todayStr
              ? 'bg-primary text-white'
              : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
          }`}
        >
          Este Mes
        </button>
        <button
          onClick={() => handleFilterChip(firstOfLastMonth, lastOfLastMonth)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            dateFrom === firstOfLastMonth && dateTo === lastOfLastMonth
              ? 'bg-primary text-white'
              : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
          }`}
        >
          Mes Anterior
        </button>
        <button
          onClick={() => handleFilterChip(firstOfYear, todayStr)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            dateFrom === firstOfYear && dateTo === todayStr
              ? 'bg-primary text-white'
              : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
          }`}
        >
          Este Año
        </button>
      </div>

      {/* Sales Table */}
      <SalesTable sales={sales} />

      {/* Create Sale Drawer */}
      <CreateSaleDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        locationId={locationId}
      />
    </div>
  );
}
