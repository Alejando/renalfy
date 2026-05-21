'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { UserRole } from '@repo/types';
import { Button } from '@/components/ui/button';
import { CashCloseTable } from '@/src/app/dashboard/financials/components/tables/CashCloseTable';
import { FinancialKpiCard } from '@/src/app/dashboard/financials/components/FinancialKpiCard';
import { CreateCashCloseDrawer } from './create-cash-close-drawer';
import { formatCurrency } from '@/lib/formatters';

interface CashCloseItem {
  id: string;
  date: string;
  status: string;
  salesTotal: string;
  incomesTotal: string;
  expensesTotal: string;
  calculatedTotal: string;
  createdAt: string;
  locationId: string;
}

interface CashCloseTabViewProps {
  cashCloses: CashCloseItem[];
  userRole: UserRole;
  locationId?: string | null;
  dateFrom?: string;
  dateTo?: string;
}

export function CashCloseTabView({
  cashCloses,
  userRole,
  locationId,
  dateFrom,
  dateTo,
}: CashCloseTabViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalRevenue = cashCloses.reduce((sum, cc) => sum + parseFloat(cc.salesTotal || '0'), 0);

    return {
      closedCount: cashCloses.length,
      totalRevenue,
    };
  }, [cashCloses]);

  // Filter chip handlers
  const handleFilterChip = (from: string, to: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (dateFrom === from && dateTo === to) {
      params.delete('dateFrom');
      params.delete('dateTo');
    } else {
      params.set('dateFrom', from);
      params.set('dateTo', to);
    }
    params.set('tab', 'cashClose');
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FinancialKpiCard
          label="Cortes Cerrados"
          value={kpis.closedCount.toString()}
          subtext={`de ${cashCloses.length} registros`}
        />
        <FinancialKpiCard
          label="Ingresos Totales"
          value={formatCurrency(kpis.totalRevenue)}
        />
      </div>

      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Corte de Caja</h2>
        <Button
          variant="gradient"
          onClick={() => setDrawerOpen(true)}
          disabled={userRole === 'STAFF'}
        >
          Nuevo Corte
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

      {/* Cash Close Table */}
      <CashCloseTable cashCloses={cashCloses} />

      {/* Create Cash Close Drawer */}
      <CreateCashCloseDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        locationId={locationId}
      />
    </div>
  );
}
