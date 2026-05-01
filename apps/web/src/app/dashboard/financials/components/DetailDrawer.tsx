'use client';

import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDate } from '@/lib/formatters';

type TransactionType = 'sale' | 'income' | 'expense' | 'cashClose';

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  transactionId: string | null;
  type: TransactionType;
}

interface SaleDetail {
  id: string;
  folio: string;
  clientId: string;
  clientName?: string;
  createdAt: string;
  items: Array<{
    id: string;
    productId: string;
    productName?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  total: number;
  paymentType: 'CASH' | 'CREDIT' | 'DEBIT' | 'TRANSFER' | 'BENEFIT';
  status: string;
}

interface IncomeDetail {
  id: string;
  date: string;
  type: 'SALES_OTHER' | 'REFUND' | 'OTHER';
  amount: number;
  description: string;
  status: string;
}

interface ExpenseDetail {
  id: string;
  date: string;
  type: 'SUPPLIES' | 'UTILITIES' | 'STAFF' | 'OTHER';
  amount: number;
  description: string;
  status: string;
}

interface CashCloseDetail {
  id: string;
  date: string;
  openingBalance: number;
  closingBalance: number;
  salesTotal: number;
  incomesTotal: number;
  expensesTotal: number;
  status: string;
}

type TransactionDetail = SaleDetail | IncomeDetail | ExpenseDetail | CashCloseDetail;

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  CREDIT: 'Crédito',
  DEBIT: 'Débito',
  TRANSFER: 'Transferencia',
  BENEFIT: 'Beneficio/Plan',
};

const INCOME_TYPE_LABELS: Record<string, string> = {
  SALES_OTHER: 'Otra venta',
  REFUND: 'Reembolso',
  OTHER: 'Otro',
};

const EXPENSE_TYPE_LABELS: Record<string, string> = {
  SUPPLIES: 'Suministros',
  UTILITIES: 'Servicios',
  STAFF: 'Personal',
  OTHER: 'Otro',
};

async function fetchSaleDetail(saleId: string): Promise<SaleDetail> {
  const res = await fetch(`/api/sales/${saleId}`);
  if (!res.ok) throw new Error('Failed to fetch sale details');
  return res.json();
}

async function fetchIncomeDetail(incomeId: string): Promise<IncomeDetail> {
  const res = await fetch(`/api/incomes/${incomeId}`);
  if (!res.ok) throw new Error('Failed to fetch income details');
  return res.json();
}

async function fetchExpenseDetail(expenseId: string): Promise<ExpenseDetail> {
  const res = await fetch(`/api/expenses/${expenseId}`);
  if (!res.ok) throw new Error('Failed to fetch expense details');
  return res.json();
}

async function fetchCashCloseDetail(cashCloseId: string): Promise<CashCloseDetail> {
  const res = await fetch(`/api/cash-closes/${cashCloseId}`);
  if (!res.ok) throw new Error('Failed to fetch cash close details');
  return res.json();
}

export function DetailDrawer({
  open,
  onClose,
  transactionId,
  type,
}: DetailDrawerProps) {
  const [data, setData] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !transactionId) return;

    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        let result: TransactionDetail;
        switch (type) {
          case 'sale':
            result = await fetchSaleDetail(transactionId);
            break;
          case 'income':
            result = await fetchIncomeDetail(transactionId);
            break;
          case 'expense':
            result = await fetchExpenseDetail(transactionId);
            break;
          case 'cashClose':
            result = await fetchCashCloseDetail(transactionId);
            break;
        }
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, transactionId, type]);

  const getTitle = () => {
    switch (type) {
      case 'sale':
        return 'Detalles de Venta';
      case 'income':
        return 'Detalles de Ingreso';
      case 'expense':
        return 'Detalles de Egreso';
      case 'cashClose':
        return 'Detalles de Corte de Caja';
    }
  };

  const renderSaleContent = (sale: SaleDetail) => (
    <div className="space-y-6">
      {/* Header info */}
      <div className="space-y-4">
        <div>
          <p className="text-xs font-label uppercase tracking-widest text-muted-foreground font-semibold">
            Folio
          </p>
          <p className="text-foreground font-medium">{sale.folio}</p>
        </div>
        <div>
          <p className="text-xs font-label uppercase tracking-widest text-muted-foreground font-semibold">
            Fecha
          </p>
          <p className="text-foreground">{formatDate(sale.createdAt)}</p>
        </div>
        <div>
          <p className="text-xs font-label uppercase tracking-widest text-muted-foreground font-semibold">
            Método de pago
          </p>
          <p className="text-foreground">
            {PAYMENT_TYPE_LABELS[sale.paymentType] || sale.paymentType}
          </p>
        </div>
      </div>

      <Separator />

      {/* Items */}
      <div className="space-y-3">
        <p className="text-xs font-label uppercase tracking-widest text-muted-foreground font-semibold">
          Items
        </p>
        <div className="space-y-3">
          {sale.items && sale.items.length > 0 ? (
            sale.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-4 p-3 bg-muted rounded-md"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.productName || item.productId}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} x {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <p className="font-medium">{formatCurrency(item.subtotal)}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sin items</p>
          )}
        </div>
      </div>

      <Separator />

      {/* Total */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-label uppercase tracking-widest text-muted-foreground font-semibold">
          Total
        </p>
        <p className="text-lg font-bold text-foreground">{formatCurrency(sale.total)}</p>
      </div>
    </div>
  );

  const renderIncomeContent = (income: IncomeDetail) => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-label uppercase tracking-widest text-muted-foreground font-semibold">
            Fecha
          </p>
          <p className="text-foreground">{formatDate(income.date)}</p>
        </div>
        <div>
          <p className="text-xs font-label uppercase tracking-widest text-muted-foreground font-semibold">
            Tipo
          </p>
          <p className="text-foreground">
            {INCOME_TYPE_LABELS[income.type] || income.type}
          </p>
        </div>
        <div>
          <p className="text-xs font-label uppercase tracking-widest text-muted-foreground font-semibold">
            Monto
          </p>
          <p className="text-lg font-bold text-foreground">
            {formatCurrency(income.amount)}
          </p>
        </div>
        <div>
          <p className="text-xs font-label uppercase tracking-widest text-muted-foreground font-semibold">
            Descripción
          </p>
          <p className="text-foreground whitespace-pre-wrap">{income.description}</p>
        </div>
      </div>
    </div>
  );

  const renderExpenseContent = (expense: ExpenseDetail) => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-label uppercase tracking-widest text-muted-foreground font-semibold">
            Fecha
          </p>
          <p className="text-foreground">{formatDate(expense.date)}</p>
        </div>
        <div>
          <p className="text-xs font-label uppercase tracking-widest text-muted-foreground font-semibold">
            Tipo
          </p>
          <p className="text-foreground">
            {EXPENSE_TYPE_LABELS[expense.type] || expense.type}
          </p>
        </div>
        <div>
          <p className="text-xs font-label uppercase tracking-widest text-muted-foreground font-semibold">
            Monto
          </p>
          <p className="text-lg font-bold text-foreground">
            {formatCurrency(expense.amount)}
          </p>
        </div>
        <div>
          <p className="text-xs font-label uppercase tracking-widest text-muted-foreground font-semibold">
            Descripción
          </p>
          <p className="text-foreground whitespace-pre-wrap">{expense.description}</p>
        </div>
      </div>
    </div>
  );

  const renderCashCloseContent = (cashClose: CashCloseDetail) => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-label uppercase tracking-widest text-muted-foreground font-semibold">
            Fecha
          </p>
          <p className="text-foreground">{formatDate(cashClose.date)}</p>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <p className="text-xs font-label uppercase tracking-widest text-muted-foreground font-semibold mb-4">
          Resumen
        </p>
        <div className="flex items-center justify-between p-3 bg-muted rounded-md">
          <p className="text-sm">Total Ventas</p>
          <p className="font-medium">{formatCurrency(cashClose.salesTotal)}</p>
        </div>
        <div className="flex items-center justify-between p-3 bg-muted rounded-md">
          <p className="text-sm">Total Ingresos</p>
          <p className="font-medium">{formatCurrency(cashClose.incomesTotal)}</p>
        </div>
        <div className="flex items-center justify-between p-3 bg-muted rounded-md">
          <p className="text-sm">Total Egresos</p>
          <p className="font-medium">{formatCurrency(cashClose.expensesTotal)}</p>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-label uppercase tracking-widest text-muted-foreground font-semibold">
            Saldo de Apertura
          </p>
          <p className="text-foreground">{formatCurrency(cashClose.openingBalance)}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-label uppercase tracking-widest text-muted-foreground font-semibold">
            Saldo de Cierre
          </p>
          <p className="text-lg font-bold text-foreground">
            {formatCurrency(cashClose.closingBalance)}
          </p>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-4 animate-pulse">
          <div className="h-6 w-full bg-muted rounded" role="status" />
          <div className="h-6 w-2/3 bg-muted rounded" role="status" />
          <div className="h-6 w-full bg-muted rounded" role="status" />
          <div className="h-6 w-full bg-muted rounded" role="status" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4 bg-destructive/10 rounded-lg">
          <p className="text-destructive text-sm font-medium">{error}</p>
        </div>
      );
    }

    if (!data) {
      return <p className="text-muted-foreground text-sm">No data available</p>;
    }

    switch (type) {
      case 'sale':
        return renderSaleContent(data as SaleDetail);
      case 'income':
        return renderIncomeContent(data as IncomeDetail);
      case 'expense':
        return renderExpenseContent(data as ExpenseDetail);
      case 'cashClose':
        return renderCashCloseContent(data as CashCloseDetail);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full max-w-md flex flex-col p-0">
        <SheetHeader className="px-8 py-6 bg-muted">
          <SheetTitle className="font-headline font-bold text-xl">
            {getTitle()}
          </SheetTitle>
          <SheetDescription>
            Ver información detallada de la transacción
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {renderContent()}
        </div>
      </SheetContent>
    </Sheet>
  );
}
