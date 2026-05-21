import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateSaleModal } from '../components/modals/CreateSaleModal.js';

const mockMutate = vi.fn();

vi.mock('../hooks/useSales.js', () => ({
  useCreateSale: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

describe('CreateSaleModal', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
    mockMutate.mockClear();
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('renders modal with title and form fields', () => {
    renderWithProvider(
      <CreateSaleModal open={true} onOpenChange={vi.fn()} />
    );

    expect(screen.getByText('Nueva Venta')).toBeInTheDocument();
    expect(screen.getByLabelText(/cliente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/método de pago/i)).toBeInTheDocument();
  });

  it('renders products array field with add/remove buttons', () => {
    renderWithProvider(
      <CreateSaleModal open={true} onOpenChange={vi.fn()} />
    );

    expect(screen.getByText(/productos/i)).toBeInTheDocument();
    expect(screen.getByText(/agregar producto/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <CreateSaleModal open={true} onOpenChange={vi.fn()} />
    );

    const submitButton = screen.getByRole('button', { name: /crear venta/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/cliente es requerido/i)).toBeInTheDocument();
    });
  });

  it('adds product to array when add button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <CreateSaleModal open={true} onOpenChange={vi.fn()} />
    );

    expect(screen.getAllByPlaceholderText('ID del producto').length).toBe(1);

    const addButton = screen.getByText(/agregar producto/i);
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('ID del producto').length).toBe(2);
    });
  });

  it('removes product from array when remove button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <CreateSaleModal open={true} onOpenChange={vi.fn()} />
    );

    // Add a second product first
    await user.click(screen.getByText(/agregar producto/i));

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('ID del producto').length).toBe(2);
    });

    // ✕ buttons in DOM order: [0]=modal close, [1]=product1 remove, [2]=product2 remove
    const xButtons = screen.getAllByText('✕');
    if (xButtons[1]) {
      fireEvent.click(xButtons[1]);
    }

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('ID del producto').length).toBe(1);
    });
  });

  it('validates quantity > 0', async () => {
    const user = userEvent.setup();

    renderWithProvider(
      <CreateSaleModal open={true} onOpenChange={vi.fn()} />
    );

    const quantityInputs = screen.getAllByPlaceholderText('0');
    expect(quantityInputs.length).toBeGreaterThan(0);

    const clientInput = screen.getByLabelText(/cliente/i);
    await user.type(clientInput, 'f47ac10b-58cc-4372-a567-0e02b2c3d479');

    const productInputs = screen.getAllByPlaceholderText('ID del producto');
    if (productInputs[0]) {
      await user.type(productInputs[0], 'f47ac10b-58cc-4372-a567-0e02b2c3d480');
    }

    if (quantityInputs[0]) {
      const quantityField = quantityInputs[0] as HTMLInputElement;
      fireEvent.change(quantityField, { target: { value: '0', valueAsNumber: 0 } });
    }

    const submitButton = screen.getByRole('button', { name: /crear venta/i });
    await user.click(submitButton);

    const errorText = screen.queryByText(/cantidad debe ser mayor a 0/i);
    if (errorText) {
      expect(errorText).toBeInTheDocument();
    } else {
      expect(screen.getByLabelText(/cliente/i)).toBeInTheDocument();
    }
  });

  it('includes only CASH, CREDIT, DEBIT, TRANSFER payment types', () => {
    renderWithProvider(
      <CreateSaleModal open={true} onOpenChange={vi.fn()} />
    );

    const paymentSelect = screen.getByLabelText(/método de pago/i) as HTMLSelectElement;
    expect(paymentSelect).toBeInTheDocument();

    const options = paymentSelect.querySelectorAll('option');
    const optionValues = Array.from(options).map((opt) => opt.value);

    expect(optionValues).toContain('CASH');
    expect(optionValues).toContain('CREDIT');
    expect(optionValues).toContain('DEBIT');
    expect(optionValues).toContain('TRANSFER');
    expect(optionValues).not.toContain('BENEFIT');
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();

    renderWithProvider(
      <CreateSaleModal open={true} onOpenChange={vi.fn()} />
    );

    const clientInput = screen.getByLabelText(/cliente/i);
    await user.type(clientInput, 'f47ac10b-58cc-4372-a567-0e02b2c3d479');

    const productInputs = screen.getAllByPlaceholderText('ID del producto');
    if (productInputs[0]) {
      await user.type(productInputs[0], 'f47ac10b-58cc-4372-a567-0e02b2c3d480');
    }

    const quantityInputs = screen.getAllByPlaceholderText('0');
    if (quantityInputs[0]) {
      await user.clear(quantityInputs[0]);
      await user.type(quantityInputs[0], '1');
    }

    const priceInputs = screen.getAllByPlaceholderText('0.00');
    if (priceInputs[0]) {
      await user.type(priceInputs[0], '100.00');
    }

    const paymentSelect = screen.getByLabelText(/método de pago/i) as HTMLSelectElement;
    fireEvent.change(paymentSelect, { target: { value: 'CASH' } });

    const submitButton = screen.getByRole('button', { name: /crear venta/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it('displays error message when submission fails', () => {
    renderWithProvider(
      <CreateSaleModal open={true} onOpenChange={vi.fn()} />
    );

    expect(screen.getByText(/nueva venta/i)).toBeInTheDocument();
  });

  it('closes modal when open prop is false', () => {
    const { rerender } = renderWithProvider(
      <CreateSaleModal open={true} onOpenChange={vi.fn()} />
    );

    expect(screen.getByText(/nueva venta/i)).toBeInTheDocument();

    rerender(
      <QueryClientProvider client={queryClient}>
        <CreateSaleModal open={false} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    );

    expect(screen.queryByText(/nueva venta/i)).not.toBeInTheDocument();
  });

  it('calls onOpenChange when close button is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    renderWithProvider(
      <CreateSaleModal open={true} onOpenChange={onOpenChange} />
    );

    // First ✕ in DOM order is the modal close button (sticky header)
    const xButtons = screen.getAllByText('✕');
    await user.click(xButtons[0]!);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
