import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FinancialFilters } from '../components/filters/FinancialFilters.js';

describe('FinancialFilters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders filter inputs', () => {
    render(<FinancialFilters />);

    expect(screen.getByLabelText('Desde')).toBeInTheDocument();
    expect(screen.getByLabelText('Hasta')).toBeInTheDocument();
    expect(screen.getByText('Limpiar')).toBeInTheDocument();
  });

  it('renders sales-specific filters when filterType is sales', () => {
    render(<FinancialFilters filterType="sales" />);

    expect(screen.getByLabelText('Cliente ID')).toBeInTheDocument();
    expect(screen.queryByLabelText('Tipo')).not.toBeInTheDocument();
  });

  it('renders income type select when filterType is income', () => {
    render(<FinancialFilters filterType="income" />);

    expect(screen.getByLabelText('Tipo')).toBeInTheDocument();
    expect(screen.queryByLabelText('Cliente ID')).not.toBeInTheDocument();

    const typeSelect = screen.getByLabelText('Tipo') as HTMLSelectElement;
    expect(typeSelect.querySelector('option[value="SALES_OTHER"]')).toBeInTheDocument();
    expect(typeSelect.querySelector('option[value="REFUND"]')).toBeInTheDocument();
  });

  it('renders expense type select when filterType is expense', () => {
    render(<FinancialFilters filterType="expense" />);

    expect(screen.getByLabelText('Tipo')).toBeInTheDocument();

    const typeSelect = screen.getByLabelText('Tipo') as HTMLSelectElement;
    expect(typeSelect.querySelector('option[value="SUPPLIES"]')).toBeInTheDocument();
    expect(typeSelect.querySelector('option[value="UTILITIES"]')).toBeInTheDocument();
  });

  it('calls onFilter with debounce when dateFrom changes', async () => {
    const onFilter = vi.fn();
    render(<FinancialFilters onFilter={onFilter} filterType="sales" />);

    const dateFromInput = screen.getByLabelText('Desde') as HTMLInputElement;
    fireEvent.change(dateFromInput, { target: { value: '2026-04-30' } });

    // Should not be called immediately
    expect(onFilter).not.toHaveBeenCalled();

    // Fast-forward 300ms for debounce
    vi.advanceTimersByTime(300);

    expect(onFilter).toHaveBeenCalledWith({ dateFrom: '2026-04-30' });
  });

  it('calls onFilter with debounce when dateTo changes', async () => {
    const onFilter = vi.fn();
    render(<FinancialFilters onFilter={onFilter} />);

    const dateToInput = screen.getByLabelText('Hasta') as HTMLInputElement;
    fireEvent.change(dateToInput, { target: { value: '2026-05-30' } });

    // Should not be called immediately
    expect(onFilter).not.toHaveBeenCalled();

    // Fast-forward 300ms for debounce
    vi.advanceTimersByTime(300);

    expect(onFilter).toHaveBeenCalledWith({ dateTo: '2026-05-30' });
  });

  it('calls onFilter with clientId for sales filter type', async () => {
    const onFilter = vi.fn();
    render(<FinancialFilters onFilter={onFilter} filterType="sales" />);

    const clientIdInput = screen.getByLabelText('Cliente ID') as HTMLInputElement;
    fireEvent.change(clientIdInput, { target: { value: 'client-123' } });

    vi.advanceTimersByTime(300);

    expect(onFilter).toHaveBeenCalledWith({ clientId: 'client-123' });
  });

  it('calls onFilter with type for income filter type', async () => {
    const onFilter = vi.fn();
    render(<FinancialFilters onFilter={onFilter} filterType="income" />);

    const typeSelect = screen.getByLabelText('Tipo') as HTMLSelectElement;
    fireEvent.change(typeSelect, { target: { value: 'REFUND' } });

    vi.advanceTimersByTime(300);

    expect(onFilter).toHaveBeenCalledWith({ type: 'REFUND' });
  });

  it('combines multiple filters in single call', async () => {
    const onFilter = vi.fn();
    render(<FinancialFilters onFilter={onFilter} filterType="sales" />);

    const dateFromInput = screen.getByLabelText('Desde') as HTMLInputElement;
    const dateToInput = screen.getByLabelText('Hasta') as HTMLInputElement;
    const clientIdInput = screen.getByLabelText('Cliente ID') as HTMLInputElement;

    fireEvent.change(dateFromInput, { target: { value: '2026-04-01' } });
    fireEvent.change(dateToInput, { target: { value: '2026-04-30' } });
    fireEvent.change(clientIdInput, { target: { value: 'client-456' } });

    vi.advanceTimersByTime(300);

    expect(onFilter).toHaveBeenCalledWith({
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      clientId: 'client-456',
    });
  });

  it('debounces rapid filter changes', async () => {
    const onFilter = vi.fn();
    render(<FinancialFilters onFilter={onFilter} filterType="sales" />);

    const dateFromInput = screen.getByLabelText('Desde') as HTMLInputElement;

    fireEvent.change(dateFromInput, { target: { value: '2026-04-01' } });
    vi.advanceTimersByTime(100);

    fireEvent.change(dateFromInput, { target: { value: '2026-04-15' } });
    vi.advanceTimersByTime(100);

    fireEvent.change(dateFromInput, { target: { value: '2026-04-30' } });
    vi.advanceTimersByTime(300);

    // Should only be called once with the final value
    expect(onFilter).toHaveBeenCalledTimes(1);
    expect(onFilter).toHaveBeenCalledWith({ dateFrom: '2026-04-30' });
  });

  it('resets all filters when Limpiar button is clicked', async () => {
    const onFilter = vi.fn();
    render(<FinancialFilters onFilter={onFilter} filterType="sales" />);

    const dateFromInput = screen.getByLabelText('Desde') as HTMLInputElement;
    const dateToInput = screen.getByLabelText('Hasta') as HTMLInputElement;
    const clientIdInput = screen.getByLabelText('Cliente ID') as HTMLInputElement;

    // Set some values
    fireEvent.change(dateFromInput, { target: { value: '2026-04-01' } });
    fireEvent.change(dateToInput, { target: { value: '2026-04-30' } });
    fireEvent.change(clientIdInput, { target: { value: 'client-123' } });

    vi.advanceTimersByTime(300);

    // Reset
    const limpiarButton = screen.getByText('Limpiar');
    fireEvent.click(limpiarButton);

    // Input values should be cleared
    expect(dateFromInput.value).toBe('');
    expect(dateToInput.value).toBe('');
    expect(clientIdInput.value).toBe('');

    // onFilter should be called with empty object
    expect(onFilter).toHaveBeenLastCalledWith({});
  });

  it('does not include clientId in filter for non-sales types', async () => {
    const onFilter = vi.fn();
    render(<FinancialFilters onFilter={onFilter} filterType="income" />);

    const dateFromInput = screen.getByLabelText('Desde') as HTMLInputElement;
    fireEvent.change(dateFromInput, { target: { value: '2026-04-30' } });

    vi.advanceTimersByTime(300);

    // Should only have dateFrom, not clientId
    expect(onFilter).toHaveBeenCalledWith({ dateFrom: '2026-04-30' });
    expect(onFilter).not.toHaveBeenCalledWith(
      expect.objectContaining({ clientId: expect.any(String) })
    );
  });

  it('does not include type in filter for sales type', async () => {
    const onFilter = vi.fn();
    render(<FinancialFilters onFilter={onFilter} filterType="sales" />);

    const dateFromInput = screen.getByLabelText('Desde') as HTMLInputElement;
    fireEvent.change(dateFromInput, { target: { value: '2026-04-30' } });

    vi.advanceTimersByTime(300);

    // Should only have dateFrom, not type
    expect(onFilter).toHaveBeenCalledWith({ dateFrom: '2026-04-30' });
    expect(onFilter).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: expect.any(String) })
    );
  });

  it('excludes empty filter values from callback', async () => {
    const onFilter = vi.fn();
    render(<FinancialFilters onFilter={onFilter} filterType="sales" />);

    const clientIdInput = screen.getByLabelText('Cliente ID') as HTMLInputElement;
    fireEvent.change(clientIdInput, { target: { value: 'client-123' } });

    vi.advanceTimersByTime(300);

    // Should only include clientId, not empty dateFrom/dateTo
    expect(onFilter).toHaveBeenCalledWith({ clientId: 'client-123' });
  });
});
