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

  it('renders chip buttons and Limpiar button', () => {
    render(<FinancialFilters />);

    expect(screen.getByText('Este Mes')).toBeInTheDocument();
    expect(screen.getByText('Mes Anterior')).toBeInTheDocument();
    expect(screen.getByText('Este Año')).toBeInTheDocument();
    expect(screen.getByText('Limpiar')).toBeInTheDocument();
  });

  it('renders sales-specific client filter when filterType is sales', () => {
    render(<FinancialFilters filterType="sales" />);

    expect(screen.getByPlaceholderText('Filtrar por cliente...')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('renders income type select when filterType is income', () => {
    render(<FinancialFilters filterType="income" />);

    const typeSelect = screen.getByRole('combobox') as HTMLSelectElement;
    expect(typeSelect).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Filtrar por cliente...')).not.toBeInTheDocument();
    expect(typeSelect.querySelector('option[value="SALES_OTHER"]')).toBeInTheDocument();
    expect(typeSelect.querySelector('option[value="REFUND"]')).toBeInTheDocument();
  });

  it('renders expense type select when filterType is expense', () => {
    render(<FinancialFilters filterType="expense" />);

    const typeSelect = screen.getByRole('combobox') as HTMLSelectElement;
    expect(typeSelect).toBeInTheDocument();
    expect(typeSelect.querySelector('option[value="SUPPLIES"]')).toBeInTheDocument();
    expect(typeSelect.querySelector('option[value="UTILITIES"]')).toBeInTheDocument();
  });

  it('calls onFilter with date range when Este Mes chip is clicked', () => {
    const onFilter = vi.fn();
    render(<FinancialFilters onFilter={onFilter} filterType="sales" />);

    fireEvent.click(screen.getByText('Este Mes'));
    vi.advanceTimersByTime(300);

    expect(onFilter).toHaveBeenCalledWith(
      expect.objectContaining({
        dateFrom: expect.any(String),
        dateTo: expect.any(String),
      })
    );
  });

  it('calls onFilter with debounce when clientId changes', () => {
    const onFilter = vi.fn();
    render(<FinancialFilters onFilter={onFilter} filterType="sales" />);

    const clientInput = screen.getByPlaceholderText('Filtrar por cliente...');
    fireEvent.change(clientInput, { target: { value: 'client-123' } });

    expect(onFilter).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(onFilter).toHaveBeenCalledWith({ clientId: 'client-123' });
  });

  it('calls onFilter with clientId for sales filter type', () => {
    const onFilter = vi.fn();
    render(<FinancialFilters onFilter={onFilter} filterType="sales" />);

    const clientInput = screen.getByPlaceholderText('Filtrar por cliente...');
    fireEvent.change(clientInput, { target: { value: 'client-123' } });

    vi.advanceTimersByTime(300);

    expect(onFilter).toHaveBeenCalledWith({ clientId: 'client-123' });
  });

  it('calls onFilter with type for income filter type', () => {
    const onFilter = vi.fn();
    render(<FinancialFilters onFilter={onFilter} filterType="income" />);

    const typeSelect = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(typeSelect, { target: { value: 'REFUND' } });

    vi.advanceTimersByTime(300);

    expect(onFilter).toHaveBeenCalledWith({ type: 'REFUND' });
  });

  it('combines date chip and client filter in single debounced call', () => {
    const onFilter = vi.fn();
    render(<FinancialFilters onFilter={onFilter} filterType="sales" />);

    const clientInput = screen.getByPlaceholderText('Filtrar por cliente...');

    fireEvent.click(screen.getByText('Este Mes'));
    fireEvent.change(clientInput, { target: { value: 'client-456' } });

    vi.advanceTimersByTime(300);

    expect(onFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        clientId: 'client-456',
        dateFrom: expect.any(String),
        dateTo: expect.any(String),
      })
    );
  });

  it('debounces rapid filter changes', () => {
    const onFilter = vi.fn();
    render(<FinancialFilters onFilter={onFilter} filterType="sales" />);

    const clientInput = screen.getByPlaceholderText('Filtrar por cliente...');

    fireEvent.change(clientInput, { target: { value: 'a' } });
    vi.advanceTimersByTime(100);

    fireEvent.change(clientInput, { target: { value: 'ab' } });
    vi.advanceTimersByTime(100);

    fireEvent.change(clientInput, { target: { value: 'client-123' } });
    vi.advanceTimersByTime(300);

    expect(onFilter).toHaveBeenCalledTimes(1);
    expect(onFilter).toHaveBeenCalledWith({ clientId: 'client-123' });
  });

  it('resets all filters when Limpiar button is clicked', () => {
    const onFilter = vi.fn();
    render(<FinancialFilters onFilter={onFilter} filterType="sales" />);

    const clientInput = screen.getByPlaceholderText(
      'Filtrar por cliente...'
    ) as HTMLInputElement;

    fireEvent.click(screen.getByText('Este Mes'));
    fireEvent.change(clientInput, { target: { value: 'client-123' } });
    vi.advanceTimersByTime(300);

    fireEvent.click(screen.getByText('Limpiar'));

    expect(clientInput.value).toBe('');
    expect(onFilter).toHaveBeenLastCalledWith({});
  });

  it('does not include clientId in filter for non-sales types', () => {
    const onFilter = vi.fn();
    render(<FinancialFilters onFilter={onFilter} filterType="income" />);

    fireEvent.click(screen.getByText('Este Mes'));
    vi.advanceTimersByTime(300);

    expect(onFilter).not.toHaveBeenCalledWith(
      expect.objectContaining({ clientId: expect.any(String) })
    );
  });

  it('does not include type in filter for sales type', () => {
    const onFilter = vi.fn();
    render(<FinancialFilters onFilter={onFilter} filterType="sales" />);

    const clientInput = screen.getByPlaceholderText('Filtrar por cliente...');
    fireEvent.change(clientInput, { target: { value: 'client-123' } });

    vi.advanceTimersByTime(300);

    expect(onFilter).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: expect.any(String) })
    );
  });

  it('excludes empty filter values from callback', () => {
    const onFilter = vi.fn();
    render(<FinancialFilters onFilter={onFilter} filterType="sales" />);

    const clientInput = screen.getByPlaceholderText('Filtrar por cliente...');
    fireEvent.change(clientInput, { target: { value: 'client-123' } });

    vi.advanceTimersByTime(300);

    expect(onFilter).toHaveBeenCalledWith({ clientId: 'client-123' });
  });
});
