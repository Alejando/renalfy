'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { UserRole } from '@repo/types';
import { Button } from '@/components/ui/button';
import { ExpenseTable } from '@/src/app/dashboard/financials/components/tables/ExpenseTable';
import { FinancialKpiCard } from '@/src/app/dashboard/financials/components/FinancialKpiCard';
import { CreateExpenseDrawer } from './create-expense-drawer';
import { formatCurrency } from '@/lib/formatters';

interface ExpenseItem {
  id: string;
  type: string;
  amount: string;
  description: string | null;
  status: string;
  createdAt: string;
  locationId: string;
}

interface ExpenseTabViewProps {
  expenses: ExpenseItem[];
  userRole: UserRole;
  locationId?: string | null;
  dateFrom?: string;
  dateTo?: string;
}

export function ExpenseTabView({
  expenses,
  userRole,
  locationId,
  dateFrom,
  dateTo,
}: ExpenseTabViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0);
    const count = expenses.length;

    return {
      total,
      count,
    };
  }, [expenses]);

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
    params.set('tab', 'expense');
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
          label="Total de Egresos"
          value={formatCurrency(kpis.total)}
          subtext={`${kpis.count} registros`}
        />
        <FinancialKpiCard
          label="Promedio por Egreso"
          value={formatCurrency(kpis.count > 0 ? kpis.total / kpis.count : 0)}
        />
      </div>

      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Egresos</h2>
        <Button
          variant="gradient"
          onClick={() => setDrawerOpen(true)}
          disabled={userRole === 'STAFF'}
        >
          Nuevo Egreso
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

      {/* Expense Table */}
      <ExpenseTable expenses={expenses} />

      {/* Create Expense Drawer */}
      <CreateExpenseDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        locationId={locationId}
      />
    </div>
  );
}
