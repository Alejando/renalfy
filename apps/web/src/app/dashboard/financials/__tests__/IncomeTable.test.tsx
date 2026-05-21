import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IncomeTable } from '../components/tables/IncomeTable.js';

interface IncomeItem {
  id: string;
  createdAt: string;
  type: string;
  amount: string | number;
  description?: string | null;
  status: 'ACTIVE' | 'CANCELLED' | string;
}

describe('IncomeTable', () => {
  const mockIncomes = [
    {
      id: '1',
      createdAt: '2026-04-30',
      type: 'Consulta',
      amount: '500.00',
      description: 'Pago por consulta',
      status: 'ACTIVE' as const,
    },
    {
      id: '2',
      createdAt: '2026-04-29',
      type: 'Servicios',
      amount: '1500.00',
      description: 'Pago por servicios',
      status: 'CANCELLED' as const,
    },
    {
      id: '3',
      createdAt: '2026-04-28',
      type: 'Otros',
      amount: '300.00',
      description: 'Ingreso diverso',
      status: 'ACTIVE' as const,
    },
  ];

  it('renders loading state', () => {
    render(<IncomeTable isLoading={true} />);
    expect(screen.getByText('Cargando ingresos...')).toBeInTheDocument();
  });

  it('renders empty state when no incomes provided', () => {
    render(<IncomeTable incomes={[]} />);
    expect(screen.getByText('No hay ingresos para mostrar')).toBeInTheDocument();
  });

  it('renders empty state when incomes is undefined', () => {
    render(<IncomeTable />);
    expect(screen.getByText('No hay ingresos para mostrar')).toBeInTheDocument();
  });

  it('renders table with incomes data', () => {
    render(<IncomeTable incomes={mockIncomes} />);

    // Check headers
    expect(screen.getByText('Fecha')).toBeInTheDocument();
    expect(screen.getByText('Tipo')).toBeInTheDocument();
    expect(screen.getByText('Monto')).toBeInTheDocument();
    expect(screen.getByText('Descripción')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.getByText('Acciones')).toBeInTheDocument();

    // Check data
    expect(screen.getByText('Consulta')).toBeInTheDocument();
    expect(screen.getByText('Servicios')).toBeInTheDocument();
    expect(screen.getByText('Otros')).toBeInTheDocument();
  });

  it('displays correct status badges', () => {
    render(<IncomeTable incomes={mockIncomes} />);

    // Check for both ACTIVE and CANCELLED status labels
    const activoBadges = screen.getAllByText('Activo');
    expect(activoBadges.length).toBe(2); // Two ACTIVE incomes

    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });

  it('formats currency correctly', () => {
    render(<IncomeTable incomes={mockIncomes} />);

    // Mexican peso format: $ amount
    expect(screen.getByText('$500.00')).toBeInTheDocument();
    expect(screen.getByText('$1,500.00')).toBeInTheDocument();
    expect(screen.getByText('$300.00')).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    render(<IncomeTable incomes={mockIncomes} />);

    // Spanish date format: DD/MM/YYYY
    const cells = screen.getAllByRole('cell');
    const dateCells = cells.filter((cell) => {
      const text = cell.textContent;
      return text && /\d{2}\/\d{2}\/\d{4}/.test(text);
    });
    expect(dateCells.length).toBe(3); // One date per income
  });

  it('calls onDetails when Detalles button is clicked', () => {
    const onDetails = vi.fn();
    render(<IncomeTable incomes={mockIncomes} onDetails={onDetails} />);

    const detailsButtons = screen.getAllByText('Detalles');
    if (detailsButtons[0]) {
      fireEvent.click(detailsButtons[0]);
    }

    expect(onDetails).toHaveBeenCalledWith('1');
  });

  it('calls onCancel when Cancelar button is clicked', () => {
    const onCancel = vi.fn();
    render(<IncomeTable incomes={mockIncomes} onCancel={onCancel} />);

    const cancelButtons = screen.getAllByText('Cancelar');
    if (cancelButtons[0]) {
      fireEvent.click(cancelButtons[0]);
    }

    expect(onCancel).toHaveBeenCalledWith('1');
  });

  it('only shows Cancelar button for ACTIVE incomes', () => {
    render(<IncomeTable incomes={mockIncomes} onCancel={vi.fn()} />);

    // Should have 2 Cancelar buttons (for 2 ACTIVE incomes)
    const cancelButtons = screen.getAllByText('Cancelar');
    expect(cancelButtons.length).toBe(2);

    // First and third rows are ACTIVE, second is CANCELLED
    if (mockIncomes[0]) expect(mockIncomes[0].status).toBe('ACTIVE');
    if (mockIncomes[1]) expect(mockIncomes[1].status).toBe('CANCELLED');
    if (mockIncomes[2]) expect(mockIncomes[2].status).toBe('ACTIVE');
  });

  it('displays description when provided', () => {
    const incomesWithDescription: IncomeItem[] = [
      {
        id: '1',
        createdAt: '2026-04-30',
        type: 'Consulta',
        amount: '500.00',
        description: 'Pago por consulta especial',
        status: 'ACTIVE' as const,
      },
    ];

    render(<IncomeTable incomes={incomesWithDescription} />);
    expect(screen.getByText('Pago por consulta especial')).toBeInTheDocument();
  });

  it('displays dash when description is not provided', () => {
    const incomesWithoutDescription: IncomeItem[] = [
      {
        id: '1',
        createdAt: '2026-04-30',
        type: 'Consulta',
        amount: '500.00',
        description: undefined,
        status: 'ACTIVE' as const,
      },
    ];

    render(<IncomeTable incomes={incomesWithoutDescription} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});
