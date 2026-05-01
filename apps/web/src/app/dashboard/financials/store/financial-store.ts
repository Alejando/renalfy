import { create } from 'zustand';

type TabType = 'sales' | 'income' | 'expense' | 'cashClose';
type ModalType = 'create-sale' | 'create-income' | 'create-expense' | 'create-cashClose' | 'details' | null;

interface FinancialStore {
  activeTab: TabType;
  openModal: ModalType;
  selectedTransactionId: string | null;

  setActiveTab: (tab: TabType) => void;
  openCreateModal: (modal: Exclude<ModalType, null | 'details'>) => void;
  openDetailModal: (transactionId: string) => void;
  closeModal: () => void;
}

export const useFinancialStore = create<FinancialStore>((set) => ({
  activeTab: 'sales',
  openModal: null,
  selectedTransactionId: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  openCreateModal: (modal) => set({ openModal: modal }),
  openDetailModal: (transactionId) => set({ openModal: 'details', selectedTransactionId: transactionId }),
  closeModal: () => set({ openModal: null, selectedTransactionId: null }),
}));
