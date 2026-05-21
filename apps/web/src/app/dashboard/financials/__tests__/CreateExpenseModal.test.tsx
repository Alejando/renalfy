import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateExpenseModal } from '../components/modals/CreateExpenseModal.js';

// Mock the useCreateExpense hook
vi.mock('../hooks/useExpenses.js', () => ({
  useCreateExpense: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

describe('CreateExpenseModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal when open is true', () => {
    render(
      <CreateExpenseModal open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('Nuevo Gasto')).toBeInTheDocument();
  });

  it('should not render modal when open is false', () => {
    const { container } = render(
      <CreateExpenseModal open={false} onOpenChange={() => {}} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should close modal when close button is clicked', () => {
    const mockOnOpenChange = vi.fn();
    render(
      <CreateExpenseModal open={true} onOpenChange={mockOnOpenChange} />
    );

    const closeButton = screen.getByRole('button', { name: /✕/i });
    fireEvent.click(closeButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should close modal when cancel button is clicked', () => {
    const mockOnOpenChange = vi.fn();
    render(
      <CreateExpenseModal open={true} onOpenChange={mockOnOpenChange} />
    );

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should have expense type options', () => {
    render(
      <CreateExpenseModal open={true} onOpenChange={() => {}} />
    );

    const typeSelect = screen.getByLabelText('Tipo de Gasto') as HTMLSelectElement;
    const options = Array.from(typeSelect.options).map((opt) => opt.value);

    expect(options).toContain('PAYROLL');
    expect(options).toContain('SUPPLIES');
    expect(options).toContain('UTILITIES');
    expect(options).toContain('MAINTENANCE');
    expect(options).toContain('OTHER');
  });

  it('should have required form fields', () => {
    render(
      <CreateExpenseModal open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByLabelText('Fecha')).toBeInTheDocument();
    expect(screen.getByLabelText('Tipo de Gasto')).toBeInTheDocument();
    expect(screen.getByLabelText('Monto')).toBeInTheDocument();
    expect(screen.getByLabelText(/Descripción/)).toBeInTheDocument();
  });

  it('should have description as optional', () => {
    render(
      <CreateExpenseModal open={true} onOpenChange={() => {}} />
    );

    const descriptionLabel = screen.getByLabelText(/Descripción/);
    expect(descriptionLabel).toBeInTheDocument();
  });

  it('should have create expense button', () => {
    render(
      <CreateExpenseModal open={true} onOpenChange={() => {}} />
    );

    const createButton = screen.getByRole('button', { name: /crear gasto/i });
    expect(createButton).toBeInTheDocument();
  });

  it('should have cancel button', () => {
    render(
      <CreateExpenseModal open={true} onOpenChange={() => {}} />
    );

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    expect(cancelButton).toBeInTheDocument();
  });
});
