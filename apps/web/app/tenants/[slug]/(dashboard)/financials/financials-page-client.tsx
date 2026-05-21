'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { UserRole } from '@repo/types';
import { SalesTabView } from './sales-tab';
import { IncomeTabView } from './income-tab';
import { ExpenseTabView } from './expense-tab';
import { CashCloseTabView } from './cash-close-tab';

interface PaginatedData<T> {
  data: T[];
  total: number;
  limit: number;
  page: number;
}

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

interface IncomeItem {
  id: string;
  type: string;
  amount: string;
  description: string | null;
  status: string;
  createdAt: string;
  locationId: string;
}

interface ExpenseItem {
  id: string;
  type: string;
  amount: string;
  description: string | null;
  status: string;
  createdAt: string;
  locationId: string;
}

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

interface FinancialsPageClientProps {
  tab: string;
  userRole: UserRole;
  userLocationId: string | null;
  salesData?: PaginatedData<SaleItem>;
  incomesData?: PaginatedData<IncomeItem>;
  expensesData?: PaginatedData<ExpenseItem>;
  cashClosesData?: PaginatedData<CashCloseItem>;
  dateFrom?: string;
  dateTo?: string;
  clientId?: string;
  status?: string;
  type?: string;
}

export function FinancialsPageClient({
  tab,
  userRole,
  userLocationId,
  salesData,
  incomesData,
  expensesData,
  cashClosesData,
  dateFrom,
  dateTo,
}: FinancialsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    // Clear filters when switching tabs
    params.delete('dateFrom');
    params.delete('dateTo');
    params.delete('clientId');
    params.delete('status');
    params.delete('type');
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border">
        {[
          { id: 'sales', label: 'Ventas' },
          { id: 'income', label: 'Ingresos' },
          { id: 'expense', label: 'Egresos' },
          { id: 'cashClose', label: 'Corte de Caja' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`pb-3 px-4 font-medium text-sm transition-colors ${
              tab === t.id
                ? 'text-primary border-b-2 border-primary'
                : 'text-secondary hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'sales' && salesData && (
        <SalesTabView
          sales={salesData.data}
          userRole={userRole}
          locationId={userLocationId}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
      )}

      {tab === 'income' && incomesData && (
        <IncomeTabView
          incomes={incomesData.data}
          userRole={userRole}
          locationId={userLocationId}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
      )}

      {tab === 'expense' && expensesData && (
        <ExpenseTabView
          expenses={expensesData.data}
          userRole={userRole}
          locationId={userLocationId}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
      )}

      {tab === 'cashClose' && cashClosesData && (
        <CashCloseTabView
          cashCloses={cashClosesData.data}
          userRole={userRole}
          locationId={userLocationId}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
      )}
    </div>
  );
}
