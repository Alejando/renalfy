import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/app/actions/purchase-orders', () => ({
  fetchProductsForSupplierAction: vi.fn(),
  fetchProductsForSelectAction: vi.fn(),
  addOrderItemAction: vi.fn(),
}));

import {
  fetchProductsForSupplierAction,
  fetchProductsForSelectAction,
  addOrderItemAction,
} from '@/app/actions/purchase-orders';
import { AddOrderItemDialog } from './add-order-item-dialog';

const PROD_SUPPLIER = {
  id: 'sp-1',
  productId: 'p-1',
  price: '150.00',
  leadTimeDays: 5,
  product: { id: 'p-1', name: 'Guantes de Látex', brand: 'MedGlove' },
};

const PROD_SUPPLIER_2 = {
  id: 'sp-2',
  productId: 'p-2',
  price: '250.50',
  leadTimeDays: null,
  product: { id: 'p-2', name: 'Mascarillas', brand: null },
};

const ALL = [
  { id: 'p-1', name: 'Guantes de Látex' },
  { id: 'p-2', name: 'Mascarillas' },
  { id: 'p-3', name: 'Gel Antibacterial' },
];

describe('AddOrderItemDialog', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchProductsForSupplierAction).mockResolvedValue([]);
    vi.mocked(fetchProductsForSelectAction).mockResolvedValue([]);
  });

  function renderOpen() {
    return render(
      <AddOrderItemDialog
        open={true}
        orderId="o-1"
        supplierId="s-1"
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );
  }

  it('renders step 1 title', () => {
    renderOpen();
    expect(screen.getByText('Seleccionar Producto')).toBeInTheDocument();
  });

  it('shows loading initially', () => {
    // Keep promises pending to show loading state
    vi.mocked(fetchProductsForSupplierAction).mockReturnValue(
      new Promise(() => {}),
    );
    renderOpen();
    expect(screen.getByText(/cargando productos/i)).toBeInTheDocument();
  });

  it('shows supplier products after load with prices', async () => {
    vi.mocked(fetchProductsForSupplierAction).mockResolvedValue([PROD_SUPPLIER]);
    vi.mocked(fetchProductsForSelectAction).mockResolvedValue(ALL);

    renderOpen();

    await waitFor(() => {
      expect(screen.getByText('Guantes de Látex')).toBeInTheDocument();
    });

    expect(screen.getByText(/medglove/i)).toBeInTheDocument();
    expect(screen.getByText('$150.00')).toBeInTheDocument();
  });

  it('shows unassociated products section with inline creation label', async () => {
    vi.mocked(fetchProductsForSupplierAction).mockResolvedValue([PROD_SUPPLIER]);
    vi.mocked(fetchProductsForSelectAction).mockResolvedValue(ALL);

    renderOpen();

    await waitFor(() => {
      expect(screen.getByText('Gel Antibacterial')).toBeInTheDocument();
    });

    expect(screen.getByText(/otros productos/i)).toBeInTheDocument();
  });

  it('navigates to step 2 when supplier product is clicked', async () => {
    vi.mocked(fetchProductsForSupplierAction).mockResolvedValue([PROD_SUPPLIER]);
    vi.mocked(fetchProductsForSelectAction).mockResolvedValue(ALL);

    renderOpen();

    await waitFor(() => {
      expect(screen.getByText('Guantes de Látex')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Guantes de Látex'));

    await waitFor(() => {
      expect(screen.getByText('Cantidad y Precio')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('150.00')).toBeInTheDocument();
  });

  it('shows empty state when no products at all', async () => {
    vi.mocked(fetchProductsForSupplierAction).mockResolvedValue([]);
    vi.mocked(fetchProductsForSelectAction).mockResolvedValue([]);

    renderOpen();

    await waitFor(() => {
      expect(
        screen.getByText(/no hay productos disponibles/i),
      ).toBeInTheDocument();
    });
  });

  it('should not call onSuccess when submit fails validation', async () => {
    vi.mocked(fetchProductsForSupplierAction).mockResolvedValue([PROD_SUPPLIER]);
    vi.mocked(fetchProductsForSelectAction).mockResolvedValue(ALL);
    vi.mocked(addOrderItemAction).mockResolvedValue(null);

    renderOpen();

    await waitFor(() => {
      expect(screen.getByText('Guantes de Látex')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Guantes de Látex'));

    await waitFor(() => {
      expect(screen.getByText('Cantidad y Precio')).toBeInTheDocument();
    });

    const qty = document.getElementById('item-quantity') as HTMLInputElement;
    fireEvent.input(qty, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /agregar a la orden/i }));

    // Should not call onSuccess since min(1) failed
    await waitFor(() => {
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  it('calls onSuccess on valid submit', async () => {
    vi.mocked(fetchProductsForSupplierAction).mockResolvedValue([PROD_SUPPLIER]);
    vi.mocked(fetchProductsForSelectAction).mockResolvedValue(ALL);
    vi.mocked(addOrderItemAction).mockResolvedValue(null);

    renderOpen();

    await waitFor(() => {
      expect(screen.getByText('Guantes de Látex')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Guantes de Látex'));

    await waitFor(() => {
      expect(screen.getByText('Cantidad y Precio')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /agregar a la orden/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('shows server error on failure', async () => {
    vi.mocked(fetchProductsForSupplierAction).mockResolvedValue([PROD_SUPPLIER]);
    vi.mocked(fetchProductsForSelectAction).mockResolvedValue(ALL);
    vi.mocked(addOrderItemAction).mockResolvedValue({ error: 'Error servidor' });

    renderOpen();

    await waitFor(() => {
      expect(screen.getByText('Guantes de Látex')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Guantes de Látex'));

    await waitFor(() => {
      expect(screen.getByText('Cantidad y Precio')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /agregar a la orden/i }));

    await waitFor(() => {
      expect(screen.getByText('Error servidor')).toBeInTheDocument();
    });
  });

  it('goes back to step 1 on back button', async () => {
    vi.mocked(fetchProductsForSupplierAction).mockResolvedValue([PROD_SUPPLIER]);
    vi.mocked(fetchProductsForSelectAction).mockResolvedValue(ALL);

    renderOpen();

    await waitFor(() => {
      expect(screen.getByText('Guantes de Látex')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Guantes de Látex'));

    await waitFor(() => {
      expect(screen.getByText('Cantidad y Precio')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /atrás/i }));

    await waitFor(() => {
      expect(screen.getByText('Seleccionar Producto')).toBeInTheDocument();
    });
  });

  it('shows multiple supplier products', async () => {
    vi.mocked(fetchProductsForSupplierAction).mockResolvedValue([
      PROD_SUPPLIER,
      PROD_SUPPLIER_2,
    ]);
    vi.mocked(fetchProductsForSelectAction).mockResolvedValue(ALL);

    renderOpen();

    await waitFor(() => {
      expect(screen.getByText('Guantes de Látex')).toBeInTheDocument();
      expect(screen.getByText('Mascarillas')).toBeInTheDocument();
    });
  });
});