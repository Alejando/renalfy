import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CashCloseTable } from '../components/tables/CashCloseTable.js';

interface CashCloseItem {
  id: string;
  date: string;
  totalSales: number;
  totalIncomes: number;
  totalExpenses: number;
  totalCash: number;
}

describe('CashCloseTable', () => {
  const mockCashCloses = [
    {
      id: '1',
      date: '2026-04-30',
      totalSales: 5000,
      totalIncomes: 2000,
      totalExpenses: 1500,
      totalCash: 5500,
    },
    {
      id: '2',
      date: '2026-04-29',
      totalSales: 4500,
      totalIncomes: 1800,
      totalExpenses: 1200,
      totalCash: 5100,
    },
    {
      id: '3',
      date: '2026-04-28',
      totalSales: 6000,
      totalIncomes: 2500,
      totalExpenses: 2000,
      totalCash: 6500,
    },
  ];

  it('renders loading state', () => {
    render(<CashCloseTable isLoading={true} />);
    expect(screen.getByText('Cargando cortes de caja...')).toBeInTheDocument();
  });

  it('renders empty state when no cash closes provided', () => {
    render(<CashCloseTable cashCloses={[]} />);
    expect(screen.getByText('No hay cortes de caja para mostrar')).toBeInTheDocument();
  });

  it('renders empty state when cashCloses is undefined', () => {
    render(<CashCloseTable />);
    expect(screen.getByText('No hay cortes de caja para mostrar')).toBeInTheDocument();
  });

  it('renders table with cash closes data', () => {
    render(<CashCloseTable cashCloses={mockCashCloses} />);

    // Check headers
    expect(screen.getByText('Fecha')).toBeInTheDocument();
    expect(screen.getByText('Ventas')).toBeInTheDocument();
    expect(screen.getByText('Ingresos')).toBeInTheDocument();
    expect(screen.getByText('Egresos')).toBeInTheDocument();
    expect(screen.getByText('Total en Caja')).toBeInTheDocument();
    expect(screen.getByText('Acciones')).toBeInTheDocument();
  });

  it('formats currency correctly for all amounts', () => {
    render(<CashCloseTable cashCloses={mockCashCloses} />);

    // Check that we have currency formatted values for all rows
    const currencyElements = screen.getAllByText(/^\$[\d,]+\.\d{2}$/);
    // Each cash close has 5 currency values (Ventas, Ingresos, Egresos, Total en Caja)
    // 3 cash closes * 4 amounts + 1 extra for variance = at least 12
    expect(currencyElements.length).toBeGreaterThanOrEqual(12);
  });

  it('formats dates correctly', () => {
    render(<CashCloseTable cashCloses={mockCashCloses} />);

    // Spanish date format: DD/MM/YYYY
    const cells = screen.getAllByRole('cell');
    const dateCells = cells.filter((cell) => {
      const text = cell.textContent;
      return text && /\d{2}\/\d{2}\/\d{4}/.test(text);
    });
    expect(dateCells.length).toBe(3); // One date per cash close
  });

  it('calls onDetails when Detalles button is clicked', () => {
    const onDetails = vi.fn();
    render(<CashCloseTable cashCloses={mockCashCloses} onDetails={onDetails} />);

    const detailsButtons = screen.getAllByText('Detalles');
    if (detailsButtons[0]) {
      fireEvent.click(detailsButtons[0]);
    }

    expect(onDetails).toHaveBeenCalledWith('1');
  });

  it('displays only Detalles button (no cancel option)', () => {
    const onDetails = vi.fn();
    render(<CashCloseTable cashCloses={mockCashCloses} onDetails={onDetails} />);

    // Should have exactly 3 Detalles buttons (one per cash close)
    const detailsButtons = screen.getAllByText('Detalles');
    expect(detailsButtons.length).toBe(3);

    // Should not have any Cancelar buttons
    const cancelButtons = screen.queryAllByText('Cancelar');
    expect(cancelButtons.length).toBe(0);
  });

  it('renders all columns with correct data', () => {
    render(<CashCloseTable cashCloses={mockCashCloses} />);

    // Verify the structure has all expected columns
    const rows = screen.getAllByRole('row');
    // 1 header row + 3 data rows = 4 rows
    expect(rows.length).toBe(4);

    // Each row should have 6 cells (Fecha, Ventas, Ingresos, Egresos, Total en Caja, Acciones)
    rows.forEach((row) => {
      const cells = row.querySelectorAll('td, th');
      expect(cells.length).toBe(6);
    });
  });

  it('displays correct total cash amounts in bold', () => {
    const { container } = render(<CashCloseTable cashCloses={mockCashCloses} />);

    // Find all cells containing total cash amounts and verify they are bold
    const boldCells = container.querySelectorAll('td.font-bold');
    expect(boldCells.length).toBe(3); // One per cash close
  });

  it('renders without onDetails prop', () => {
    render(<CashCloseTable cashCloses={mockCashCloses} />);

    // Should not render any Detalles buttons when onDetails is not provided
    const detailsButtons = screen.queryAllByText('Detalles');
    expect(detailsButtons.length).toBe(0);
  });

  it('handles zero amounts gracefully', () => {
    const cashClosesWithZero: CashCloseItem[] = [
      {
        id: '1',
        date: '2026-04-30',
        totalSales: 0,
        totalIncomes: 0,
        totalExpenses: 0,
        totalCash: 0,
      },
    ];

    render(<CashCloseTable cashCloses={cashClosesWithZero} />);
    // Should have 4 cells with $0.00 (Ventas, Ingresos, Egresos, Total)
    const zeroElements = screen.getAllByText('$0.00');
    expect(zeroElements.length).toBe(4);
  });
});
