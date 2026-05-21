'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { UserRole } from '@repo/types';
import { Button } from '@/components/ui/button';
import { IncomeTable } from '@/src/app/dashboard/financials/components/tables/IncomeTable';
import { FinancialKpiCard } from '@/src/app/dashboard/financials/components/FinancialKpiCard';
import { CreateIncomeDrawer } from './create-income-drawer';
import { formatCurrency } from '@/lib/formatters';

interface IncomeItem {
  id: string;
  type: string;
  amount: string;
  description: string | null;
  status: string;
  createdAt: string;
  locationId: string;
}

interface IncomeTabViewProps {
  incomes: IncomeItem[];
  userRole: UserRole;
  locationId?: string | null;
  dateFrom?: string;
  dateTo?: string;
}

export function IncomeTabView({
  incomes,
  userRole,
  locationId,
  dateFrom,
  dateTo,
}: IncomeTabViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const total = incomes.reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0);
    const count = incomes.length;

    return {
      total,
      count,
    };
  }, [incomes]);

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
    params.set('tab', 'income');
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
          label="Total de Ingresos"
          value={formatCurrency(kpis.total)}
          subtext={`${kpis.count} registros`}
        />
        <FinancialKpiCard
          label="Promedio por Ingreso"
          value={formatCurrency(kpis.count > 0 ? kpis.total / kpis.count : 0)}
        />
      </div>

      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ingresos</h2>
        <Button
          variant="gradient"
          onClick={() => setDrawerOpen(true)}
          disabled={userRole === 'STAFF'}
        >
          Nuevo Ingreso
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

      {/* Income Table */}
      <IncomeTable incomes={incomes} />

      {/* Create Income Drawer */}
      <CreateIncomeDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        locationId={locationId}
      />
    </div>
  );
}
