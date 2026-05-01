import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExpenseTable } from '../components/tables/ExpenseTable.js';

interface ExpenseItem {
  id: string;
  date: string;
  type: string;
  amount: number;
  description?: string;
  status: 'ACTIVE' | 'CANCELLED' | string;
}

describe('ExpenseTable', () => {
  const mockExpenses = [
    {
      id: '1',
      date: '2026-04-30',
      type: 'Mantenimiento',
      amount: 1000,
      description: 'Mantenimiento de equipos',
      status: 'ACTIVE' as const,
    },
    {
      id: '2',
      date: '2026-04-29',
      type: 'Suministros',
      amount: 500,
      description: 'Compra de suministros',
      status: 'CANCELLED' as const,
    },
    {
      id: '3',
      date: '2026-04-28',
      type: 'Servicios',
      amount: 800,
      description: 'Pago de servicios',
      status: 'ACTIVE' as const,
    },
  ];

  it('renders loading state', () => {
    render(<ExpenseTable isLoading={true} />);
    expect(screen.getByText('Cargando egresos...')).toBeInTheDocument();
  });

  it('renders empty state when no expenses provided', () => {
    render(<ExpenseTable expenses={[]} />);
    expect(screen.getByText('No hay egresos para mostrar')).toBeInTheDocument();
  });

  it('renders empty state when expenses is undefined', () => {
    render(<ExpenseTable />);
    expect(screen.getByText('No hay egresos para mostrar')).toBeInTheDocument();
  });

  it('renders table with expenses data', () => {
    render(<ExpenseTable expenses={mockExpenses} />);

    // Check headers
    expect(screen.getByText('Fecha')).toBeInTheDocument();
    expect(screen.getByText('Tipo')).toBeInTheDocument();
    expect(screen.getByText('Monto')).toBeInTheDocument();
    expect(screen.getByText('Descripción')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.getByText('Acciones')).toBeInTheDocument();

    // Check data
    expect(screen.getByText('Mantenimiento')).toBeInTheDocument();
    expect(screen.getByText('Suministros')).toBeInTheDocument();
    expect(screen.getByText('Servicios')).toBeInTheDocument();
  });

  it('displays correct status badges', () => {
    render(<ExpenseTable expenses={mockExpenses} />);

    // Check for both ACTIVE and CANCELLED status labels
    const activoBadges = screen.getAllByText('Activo');
    expect(activoBadges.length).toBe(2); // Two ACTIVE expenses

    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });

  it('formats currency correctly', () => {
    render(<ExpenseTable expenses={mockExpenses} />);

    // Mexican peso format: $ amount
    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
    expect(screen.getByText('$500.00')).toBeInTheDocument();
    expect(screen.getByText('$800.00')).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    render(<ExpenseTable expenses={mockExpenses} />);

    // Spanish date format: DD/MM/YYYY
    const cells = screen.getAllByRole('cell');
    const dateCells = cells.filter((cell) => {
      const text = cell.textContent;
      return text && /\d{2}\/\d{2}\/\d{4}/.test(text);
    });
    expect(dateCells.length).toBe(3); // One date per expense
  });

  it('calls onDetails when Detalles button is clicked', () => {
    const onDetails = vi.fn();
    render(<ExpenseTable expenses={mockExpenses} onDetails={onDetails} />);

    const detailsButtons = screen.getAllByText('Detalles');
    if (detailsButtons[0]) {
      fireEvent.click(detailsButtons[0]);
    }

    expect(onDetails).toHaveBeenCalledWith('1');
  });

  it('calls onCancel when Cancelar button is clicked', () => {
    const onCancel = vi.fn();
    render(<ExpenseTable expenses={mockExpenses} onCancel={onCancel} />);

    const cancelButtons = screen.getAllByText('Cancelar');
    if (cancelButtons[0]) {
      fireEvent.click(cancelButtons[0]);
    }

    expect(onCancel).toHaveBeenCalledWith('1');
  });

  it('only shows Cancelar button for ACTIVE expenses', () => {
    render(<ExpenseTable expenses={mockExpenses} onCancel={vi.fn()} />);

    // Should have 2 Cancelar buttons (for 2 ACTIVE expenses)
    const cancelButtons = screen.getAllByText('Cancelar');
    expect(cancelButtons.length).toBe(2);

    // First and third rows are ACTIVE, second is CANCELLED
    if (mockExpenses[0]) expect(mockExpenses[0].status).toBe('ACTIVE');
    if (mockExpenses[1]) expect(mockExpenses[1].status).toBe('CANCELLED');
    if (mockExpenses[2]) expect(mockExpenses[2].status).toBe('ACTIVE');
  });

  it('displays description when provided', () => {
    const expensesWithDescription: ExpenseItem[] = [
      {
        id: '1',
        date: '2026-04-30',
        type: 'Mantenimiento',
        amount: 1000,
        description: 'Mantenimiento urgente de equipos',
        status: 'ACTIVE' as const,
      },
    ];

    render(<ExpenseTable expenses={expensesWithDescription} />);
    expect(screen.getByText('Mantenimiento urgente de equipos')).toBeInTheDocument();
  });

  it('displays dash when description is not provided', () => {
    const expensesWithoutDescription: ExpenseItem[] = [
      {
        id: '1',
        date: '2026-04-30',
        type: 'Mantenimiento',
        amount: 1000,
        description: undefined,
        status: 'ACTIVE' as const,
      },
    ];

    render(<ExpenseTable expenses={expensesWithoutDescription} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});
