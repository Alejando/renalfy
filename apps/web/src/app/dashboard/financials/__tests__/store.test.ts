import { describe, it, expect, beforeEach } from 'vitest';
import { useFinancialStore } from '../store/financial-store.js';

describe('useFinancialStore', () => {
  beforeEach(() => {
    useFinancialStore.setState({
      activeTab: 'sales',
      openModal: null,
      selectedTransactionId: null,
    });
  });

  it('should have initial state', () => {
    const state = useFinancialStore.getState();
    expect(state.activeTab).toBe('sales');
    expect(state.openModal).toBeNull();
  });

  it('should change active tab', () => {
    useFinancialStore.setState({ activeTab: 'income' });
    const state = useFinancialStore.getState();
    expect(state.activeTab).toBe('income');
  });

  it('should open modal', () => {
    useFinancialStore.setState({ openModal: 'create-sale' });
    const state = useFinancialStore.getState();
    expect(state.openModal).toBe('create-sale');
  });

  it('should close modal', () => {
    useFinancialStore.setState({ openModal: null });
    const state = useFinancialStore.getState();
    expect(state.openModal).toBeNull();
  });
});
