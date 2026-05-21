import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SalesTable } from '../components/tables/SalesTable.js';

interface SalesItem {
  id: string;
  folio: string;
  clientId?: string;
  clientName?: string;
  date: string;
  total: number;
  status: 'ACTIVE' | 'CANCELLED' | string;
}

describe('SalesTable', () => {
  const mockSales = [
    {
      id: '1',
      folio: 'LOC-2026-00001',
      clientName: 'John Doe',
      date: '2026-04-30',
      total: 1000,
      status: 'ACTIVE' as const,
    },
    {
      id: '2',
      folio: 'LOC-2026-00002',
      clientName: 'Jane Smith',
      date: '2026-04-29',
      total: 2500,
      status: 'CANCELLED' as const,
    },
    {
      id: '3',
      folio: 'LOC-2026-00003',
      clientName: 'Bob Johnson',
      date: '2026-04-28',
      total: 750,
      status: 'ACTIVE' as const,
    },
  ];

  it('renders loading state', () => {
    render(<SalesTable isLoading={true} />);
    expect(screen.getByText('Cargando ventas...')).toBeInTheDocument();
  });

  it('renders empty state when no sales provided', () => {
    render(<SalesTable sales={[]} />);
    expect(screen.getByText('No hay ventas para mostrar')).toBeInTheDocument();
  });

  it('renders empty state when sales is undefined', () => {
    render(<SalesTable />);
    expect(screen.getByText('No hay ventas para mostrar')).toBeInTheDocument();
  });

  it('renders table with sales data', () => {
    render(<SalesTable sales={mockSales} />);

    // Check headers
    expect(screen.getByText('Folio')).toBeInTheDocument();
    expect(screen.getByText('Cliente')).toBeInTheDocument();
    expect(screen.getByText('Fecha')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.getByText('Acciones')).toBeInTheDocument();

    // Check data
    expect(screen.getByText('LOC-2026-00001')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
  });

  it('displays correct status badges', () => {
    render(<SalesTable sales={mockSales} />);

    // Check for both ACTIVE and CANCELLED status labels
    const activoBadges = screen.getAllByText('Activo');
    expect(activoBadges.length).toBe(2); // Two ACTIVE sales

    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });

  it('formats currency correctly', () => {
    render(<SalesTable sales={mockSales} />);

    // Mexican peso format: $ amount
    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
    expect(screen.getByText('$2,500.00')).toBeInTheDocument();
    expect(screen.getByText('$750.00')).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    render(<SalesTable sales={mockSales} />);

    // Spanish date format: DD/MM/YYYY (may be affected by timezone)
    // Just verify that date formatting is applied to all rows
    const cells = screen.getAllByRole('cell');
    const dateCells = cells.filter((cell) => {
      const text = cell.textContent;
      return text && /\d{2}\/\d{2}\/\d{4}/.test(text);
    });
    expect(dateCells.length).toBe(3); // One date per sale
  });

  it('calls onDetails when Detalles button is clicked', () => {
    const onDetails = vi.fn();
    render(<SalesTable sales={mockSales} onDetails={onDetails} />);

    const detailsButtons = screen.getAllByText('Detalles');
    if (detailsButtons[0]) {
      fireEvent.click(detailsButtons[0]);
    }

    expect(onDetails).toHaveBeenCalledWith('1');
  });

  it('calls onCancel when Anular button is clicked', () => {
    const onCancel = vi.fn();
    render(<SalesTable sales={mockSales} onCancel={onCancel} />);

    const cancelButtons = screen.getAllByText('Anular');
    if (cancelButtons[0]) {
      fireEvent.click(cancelButtons[0]);
    }

    expect(onCancel).toHaveBeenCalledWith('1');
  });

  it('only shows Anular button for ACTIVE sales', () => {
    render(<SalesTable sales={mockSales} onCancel={vi.fn()} />);

    // Should have 2 Anular buttons (for 2 ACTIVE sales)
    const cancelButtons = screen.getAllByText('Anular');
    expect(cancelButtons.length).toBe(2);

    // First and third rows are ACTIVE, second is CANCELLED
    if (mockSales[0]) expect(mockSales[0].status).toBe('ACTIVE');
    if (mockSales[1]) expect(mockSales[1].status).toBe('CANCELLED');
    if (mockSales[2]) expect(mockSales[2].status).toBe('ACTIVE');
  });

  it('displays client ID when client name is not provided', () => {
    const salesWithoutName: SalesItem[] = [
      {
        id: '1',
        folio: 'LOC-2026-00001',
        clientId: 'client-123',
        clientName: undefined,
        date: '2026-04-30',
        total: 1000,
        status: 'ACTIVE' as const,
      },
    ];

    render(<SalesTable sales={salesWithoutName} />);
    expect(screen.getByText('client-123')).toBeInTheDocument();
  });

  it('displays dash when neither client name nor ID is provided', () => {
    const salesWithoutNameOrId: SalesItem[] = [
      {
        id: '1',
        folio: 'LOC-2026-00001',
        clientId: undefined,
        clientName: undefined,
        date: '2026-04-30',
        total: 1000,
        status: 'ACTIVE' as const,
      },
    ];

    render(<SalesTable sales={salesWithoutNameOrId} />);
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });
});
