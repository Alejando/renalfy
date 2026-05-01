'use client';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useFinancialStore } from '../store/financial-store';
import { SalesTab } from './SalesTab';
import { IncomeTab } from './IncomeTab';
import { ExpenseTab } from './ExpenseTab';
import { CashCloseTab } from './CashCloseTab';
import { DetailDrawer } from './DetailDrawer';

export function FinancialsPage() {
  const { activeTab, setActiveTab, openModal, selectedTransactionId, closeModal } =
    useFinancialStore();

  // Determine which transaction type is being viewed based on activeTab
  const getTransactionType = (): 'sale' | 'income' | 'expense' | 'cashClose' => {
    switch (activeTab) {
      case 'sales':
        return 'sale';
      case 'income':
        return 'income';
      case 'expense':
        return 'expense';
      case 'cashClose':
        return 'cashClose';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Financials</h1>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value as typeof activeTab);
      }}>
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="sales">Ventas</TabsTrigger>
          <TabsTrigger value="income">Ingresos</TabsTrigger>
          <TabsTrigger value="expense">Egresos</TabsTrigger>
          <TabsTrigger value="cashClose">Corte de Caja</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-6">
          <SalesTab />
        </TabsContent>

        <TabsContent value="income" className="mt-6">
          <IncomeTab />
        </TabsContent>

        <TabsContent value="expense" className="mt-6">
          <ExpenseTab />
        </TabsContent>

        <TabsContent value="cashClose" className="mt-6">
          <CashCloseTab />
        </TabsContent>
      </Tabs>

      {/* Detail Drawer — shown for details modal */}
      <DetailDrawer
        open={openModal === 'details'}
        onClose={closeModal}
        transactionId={selectedTransactionId}
        type={getTransactionType()}
      />
    </div>
  );
}
