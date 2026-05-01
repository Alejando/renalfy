import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateIncomeModal } from '../components/modals/CreateIncomeModal.js';

// Mock the useCreateIncome hook
vi.mock('../hooks/useIncomes.js', () => ({
  useCreateIncome: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

describe('CreateIncomeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal when open is true', () => {
    render(
      <CreateIncomeModal open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('Nuevo Ingreso')).toBeInTheDocument();
  });

  it('should not render modal when open is false', () => {
    const { container } = render(
      <CreateIncomeModal open={false} onOpenChange={() => {}} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should close modal when close button is clicked', () => {
    const mockOnOpenChange = vi.fn();
    render(
      <CreateIncomeModal open={true} onOpenChange={mockOnOpenChange} />
    );

    const closeButton = screen.getByRole('button', { name: /✕/i });
    fireEvent.click(closeButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should close modal when cancel button is clicked', () => {
    const mockOnOpenChange = vi.fn();
    render(
      <CreateIncomeModal open={true} onOpenChange={mockOnOpenChange} />
    );

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should have income type options', () => {
    render(
      <CreateIncomeModal open={true} onOpenChange={() => {}} />
    );

    const typeSelect = screen.getByLabelText('Tipo de Ingreso') as HTMLSelectElement;
    const options = Array.from(typeSelect.options).map((opt) => opt.value);

    expect(options).toContain('SALES_OTHER');
    expect(options).toContain('REFUND');
    expect(options).toContain('OTHER');
  });

  it('should have required form fields', () => {
    render(
      <CreateIncomeModal open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByLabelText('Fecha')).toBeInTheDocument();
    expect(screen.getByLabelText('Tipo de Ingreso')).toBeInTheDocument();
    expect(screen.getByLabelText('Monto')).toBeInTheDocument();
    expect(screen.getByLabelText(/Descripción/)).toBeInTheDocument();
  });

  it('should have description as optional', () => {
    render(
      <CreateIncomeModal open={true} onOpenChange={() => {}} />
    );

    const descriptionLabel = screen.getByLabelText(/Descripción/);
    expect(descriptionLabel).toBeInTheDocument();
  });

  it('should have create income button', () => {
    render(
      <CreateIncomeModal open={true} onOpenChange={() => {}} />
    );

    const createButton = screen.getByRole('button', { name: /crear ingreso/i });
    expect(createButton).toBeInTheDocument();
  });

  it('should have cancel button', () => {
    render(
      <CreateIncomeModal open={true} onOpenChange={() => {}} />
    );

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    expect(cancelButton).toBeInTheDocument();
  });
});
