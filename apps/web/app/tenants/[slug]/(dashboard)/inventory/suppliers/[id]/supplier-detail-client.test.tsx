import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { SupplierResponse } from '@repo/types';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  })),
}));

vi.mock('@/app/actions/suppliers', () => ({
  removeSupplierProductAction: vi.fn(),
}));

vi.mock('./add-supplier-product-dialog', () => ({
  AddSupplierProductDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="add-product-dialog" /> : null,
}));

import { useRouter } from 'next/navigation';
import { removeSupplierProductAction } from '@/app/actions/suppliers';
import { SupplierDetailClient } from './supplier-detail-client';

const mockRouterBack = vi.fn();

const SUPPLIER_UUID = '11111111-1111-4111-8111-111111111111';
const TENANT_UUID = '22222222-2222-4222-8222-222222222222';

function makeSupplier(overrides: Partial<SupplierResponse> = {}): SupplierResponse {
  return {
    id: SUPPLIER_UUID,
    tenantId: TENANT_UUID,
    name: 'Distribuidora Médica del Norte',
    initials: 'DMN',
    contact: 'Juan Pérez',
    phone: '5551234567',
    email: 'contacto@distribuidora.com',
    address: 'Av. Industrial 500',
    notes: 'Proveedor de confianza',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

const mockSupplierProduct = {
  id: 'sp-uuid-1',
  productId: 'prod-uuid-1',
  price: '150.00',
  leadTimeDays: 5,
  product: { id: 'prod-uuid-1', name: 'Guantes de Látex', brand: 'MedGlove' },
};

const mockAllProducts = [
  { id: 'prod-uuid-1', name: 'Guantes de Látex' },
  { id: 'prod-uuid-2', name: 'Mascarillas Quirúrgicas' },
];

describe('SupplierDetailClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      refresh: vi.fn(),
      back: mockRouterBack,
      forward: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    } as ReturnType<typeof useRouter>);
  });

  it('renders supplier info in header and card', () => {
    render(
      <SupplierDetailClient
        supplier={makeSupplier()}
        supplierProducts={[mockSupplierProduct]}
        allProducts={mockAllProducts}
        userRole="OWNER"
      />,
    );
    expect(screen.getByText('Distribuidora Médica del Norte')).toBeInTheDocument();
    expect(screen.getByText(/DMN/)).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('5551234567')).toBeInTheDocument();
    expect(screen.getByText('contacto@distribuidora.com')).toBeInTheDocument();
    expect(screen.getByText('Av. Industrial 500')).toBeInTheDocument();
    expect(screen.getByText('Proveedor de confianza')).toBeInTheDocument();
  });

  it('renders products table with correct data', () => {
    render(
      <SupplierDetailClient
        supplier={makeSupplier()}
        supplierProducts={[mockSupplierProduct]}
        allProducts={mockAllProducts}
        userRole="OWNER"
      />,
    );
    expect(screen.getByText('Guantes de Látex')).toBeInTheDocument();
    expect(screen.getByText('MedGlove')).toBeInTheDocument();
    expect(screen.getByText(/\$150\.00/)).toBeInTheDocument();
    expect(screen.getByText(/5 días/)).toBeInTheDocument();
  });

  it('shows status badge for active supplier', () => {
    render(
      <SupplierDetailClient
        supplier={makeSupplier()}
        supplierProducts={[]}
        allProducts={mockAllProducts}
        userRole="OWNER"
      />,
    );
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('shows status badge for inactive supplier', () => {
    render(
      <SupplierDetailClient
        supplier={makeSupplier({ status: 'INACTIVE' })}
        supplierProducts={[]}
        allProducts={mockAllProducts}
        userRole="OWNER"
      />,
    );
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('shows correct product count in subtitle', () => {
    render(
      <SupplierDetailClient
        supplier={makeSupplier()}
        supplierProducts={[mockSupplierProduct]}
        allProducts={mockAllProducts}
        userRole="OWNER"
      />,
    );
    expect(screen.getByText(/1 producto/)).toBeInTheDocument();
  });

  it('shows multiple products count', () => {
    const twoProducts = [
      mockSupplierProduct,
      {
        ...mockSupplierProduct,
        id: 'sp-uuid-2',
        productId: 'prod-uuid-2',
        product: { id: 'prod-uuid-2', name: 'Mascarillas', brand: null },
      },
    ];
    render(
      <SupplierDetailClient
        supplier={makeSupplier()}
        supplierProducts={twoProducts}
        allProducts={mockAllProducts}
        userRole="OWNER"
      />,
    );
    expect(screen.getByText(/2 productos/)).toBeInTheDocument();
  });

  it('shows empty state when no products', () => {
    render(
      <SupplierDetailClient
        supplier={makeSupplier()}
        supplierProducts={[]}
        allProducts={mockAllProducts}
        userRole="OWNER"
      />,
    );
    expect(screen.getByText(/sin productos asociados/i)).toBeInTheDocument();
  });

  it('shows "Agregar Producto" button for OWNER', () => {
    render(
      <SupplierDetailClient
        supplier={makeSupplier()}
        supplierProducts={[]}
        allProducts={mockAllProducts}
        userRole="OWNER"
      />,
    );
    expect(
      screen.getByRole('button', { name: /agregar producto/i }),
    ).toBeInTheDocument();
  });

  it('does not show "Agregar Producto" button for STAFF', () => {
    render(
      <SupplierDetailClient
        supplier={makeSupplier()}
        supplierProducts={[]}
        allProducts={mockAllProducts}
        userRole="STAFF"
      />,
    );
    expect(
      screen.queryByRole('button', { name: /agregar producto/i }),
    ).not.toBeInTheDocument();
  });

  it('opens add product dialog when button is clicked', () => {
    render(
      <SupplierDetailClient
        supplier={makeSupplier()}
        supplierProducts={[]}
        allProducts={mockAllProducts}
        userRole="OWNER"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /agregar producto/i }));
    expect(screen.getByTestId('add-product-dialog')).toBeInTheDocument();
  });

  it('calls router.back when back button is clicked', () => {
    render(
      <SupplierDetailClient
        supplier={makeSupplier()}
        supplierProducts={[]}
        allProducts={mockAllProducts}
        userRole="OWNER"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /volver/i }));
    expect(mockRouterBack).toHaveBeenCalledOnce();
  });

  it('does not show delete button for STAFF', () => {
    render(
      <SupplierDetailClient
        supplier={makeSupplier()}
        supplierProducts={[mockSupplierProduct]}
        allProducts={mockAllProducts}
        userRole="STAFF"
      />,
    );
    expect(
      screen.queryByRole('button', { name: /eliminar/i }),
    ).not.toBeInTheDocument();
  });

  it('calls removeSupplierProductAction when delete is confirmed', async () => {
    vi.mocked(removeSupplierProductAction).mockResolvedValueOnce(null);
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);

    render(
      <SupplierDetailClient
        supplier={makeSupplier()}
        supplierProducts={[mockSupplierProduct]}
        allProducts={mockAllProducts}
        userRole="OWNER"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }));

    await waitFor(() => {
      expect(vi.mocked(removeSupplierProductAction)).toHaveBeenCalledWith(
        SUPPLIER_UUID,
        'prod-uuid-1',
      );
    });
  });
});