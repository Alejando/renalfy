import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateCashCloseModal } from '../components/modals/CreateCashCloseModal.js';

// Mock all the hooks
vi.mock('../hooks/useCashCloses.js', () => ({
  useCashCloses: vi.fn(() => ({
    data: { data: [] },
    isLoading: false,
  })),
  useCreateCashClose: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('../hooks/useSales.js', () => ({
  useSales: vi.fn(() => ({
    data: { data: [] },
    isLoading: false,
  })),
}));

vi.mock('../hooks/useIncomes.js', () => ({
  useIncomes: vi.fn(() => ({
    data: { data: [] },
    isLoading: false,
  })),
}));

vi.mock('../hooks/useExpenses.js', () => ({
  useExpenses: vi.fn(() => ({
    data: { data: [] },
    isLoading: false,
  })),
}));

describe('CreateCashCloseModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal when open is true', () => {
    render(
      <CreateCashCloseModal open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('Nuevo Corte de Caja')).toBeInTheDocument();
  });

  it('should not render modal when open is false', () => {
    const { container } = render(
      <CreateCashCloseModal open={false} onOpenChange={() => {}} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should close modal when close button is clicked', () => {
    const mockOnOpenChange = vi.fn();
    render(
      <CreateCashCloseModal open={true} onOpenChange={mockOnOpenChange} />
    );

    const closeButton = screen.getByRole('button', { name: /✕/i });
    fireEvent.click(closeButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should close modal when cancel button is clicked', () => {
    const mockOnOpenChange = vi.fn();
    render(
      <CreateCashCloseModal open={true} onOpenChange={mockOnOpenChange} />
    );

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should display period summary section', () => {
    render(
      <CreateCashCloseModal open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('Resumen del Período')).toBeInTheDocument();
  });

  it('should have date field', () => {
    render(
      <CreateCashCloseModal open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByLabelText('Fecha del Corte')).toBeInTheDocument();
  });

  it('should have create cash close button', () => {
    render(
      <CreateCashCloseModal open={true} onOpenChange={() => {}} />
    );

    const createButton = screen.getByRole('button', { name: /crear corte de caja/i });
    expect(createButton).toBeInTheDocument();
  });

  it('should have cancel button', () => {
    render(
      <CreateCashCloseModal open={true} onOpenChange={() => {}} />
    );

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    expect(cancelButton).toBeInTheDocument();
  });

  it('should display summary labels', () => {
    render(
      <CreateCashCloseModal open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText(/Período:/)).toBeInTheDocument();
    expect(screen.getByText(/Total Ventas:/)).toBeInTheDocument();
    expect(screen.getByText(/Total Ingresos:/)).toBeInTheDocument();
    expect(screen.getByText(/Total Egresos:/)).toBeInTheDocument();
    expect(screen.getByText(/Total en Caja:/)).toBeInTheDocument();
  });
});
