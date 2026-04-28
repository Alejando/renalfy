import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { SupplierResponse, PaginatedSuppliersResponse } from '@repo/types';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/app/actions/suppliers', () => ({
  deleteSupplierAction: vi.fn(),
}));

vi.mock('./supplier-drawer', () => ({
  SupplierDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="supplier-drawer" /> : null,
}));

import { useRouter } from 'next/navigation';
import { deleteSupplierAction } from '@/app/actions/suppliers';
import { SuppliersPageClient } from './suppliers-page-client';

const mockRouterPush = vi.fn();
const mockRouterRefresh = vi.fn();

const SUPPLIER_UUID_1 = '11111111-1111-4111-8111-111111111111';
const SUPPLIER_UUID_2 = '22222222-2222-4222-8222-222222222222';
const TENANT_UUID = '33333333-3333-4333-8333-333333333333';

function makeSupplier(overrides: Partial<SupplierResponse> = {}): SupplierResponse {
  return {
    id: SUPPLIER_UUID_1,
    tenantId: TENANT_UUID,
    name: 'Distribuidora Médica del Norte',
    initials: 'DMN',
    contact: 'Juan Pérez',
    phone: '5551234567',
    email: 'contacto@distribuidora.com',
    address: 'Av. Industrial 500',
    notes: null,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeSuppliers(
  data: SupplierResponse[] = [makeSupplier()],
): PaginatedSuppliersResponse {
  return { data, total: data.length, page: 1, limit: 20 };
}

describe('SuppliersPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: mockRouterPush,
      refresh: mockRouterRefresh,
      back: vi.fn(),
      forward: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    });
  });

  it('renders page heading', () => {
    render(<SuppliersPageClient suppliers={makeSuppliers()} userRole="OWNER" />);
    expect(screen.getByRole('heading', { name: /proveedores/i })).toBeInTheDocument();
  });

  it('renders table with supplier data', () => {
    render(<SuppliersPageClient suppliers={makeSuppliers()} userRole="OWNER" />);
    expect(screen.getByText('Distribuidora Médica del Norte')).toBeInTheDocument();
    expect(screen.getByText('DMN')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('5551234567')).toBeInTheDocument();
  });

  it('shows empty state when list is empty', () => {
    render(<SuppliersPageClient suppliers={makeSuppliers([])} userRole="OWNER" />);
    expect(screen.getByText(/sin proveedores/i)).toBeInTheDocument();
  });

  it('opens supplier drawer on "Nuevo Proveedor" click', async () => {
    render(<SuppliersPageClient suppliers={makeSuppliers()} userRole="OWNER" />);
    fireEvent.click(screen.getByRole('button', { name: /nuevo proveedor/i }));
    await waitFor(() => {
      expect(screen.getByTestId('supplier-drawer')).toBeInTheDocument();
    });
  });

  it('opens supplier drawer in edit mode on "Editar" click', async () => {
    render(<SuppliersPageClient suppliers={makeSuppliers()} userRole="OWNER" />);
    fireEvent.click(screen.getByRole('button', { name: /editar/i }));
    await waitFor(() => {
      expect(screen.getByTestId('supplier-drawer')).toBeInTheDocument();
    });
  });

  it('does not show delete button for MANAGER', () => {
    render(<SuppliersPageClient suppliers={makeSuppliers()} userRole="MANAGER" />);
    expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument();
  });

  it('shows delete button for ADMIN', () => {
    render(<SuppliersPageClient suppliers={makeSuppliers()} userRole="ADMIN" />);
    expect(screen.getByRole('button', { name: /eliminar/i })).toBeInTheDocument();
  });

  it('shows status badge with correct label', () => {
    render(<SuppliersPageClient suppliers={makeSuppliers()} userRole="OWNER" />);
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('shows inactive status badge', () => {
    render(
      <SuppliersPageClient
        suppliers={makeSuppliers([makeSupplier({ status: 'INACTIVE' })])}
        userRole="OWNER"
      />,
    );
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('calls deleteSupplierAction and refreshes on delete confirm', async () => {
    vi.mocked(deleteSupplierAction).mockResolvedValueOnce(null);
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);

    render(<SuppliersPageClient suppliers={makeSuppliers()} userRole="OWNER" />);
    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }));
    await waitFor(() => {
      expect(vi.mocked(deleteSupplierAction)).toHaveBeenCalledWith(SUPPLIER_UUID_1);
    });
  });

  it('does not call deleteSupplierAction when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);

    render(<SuppliersPageClient suppliers={makeSuppliers()} userRole="OWNER" />);
    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }));
    expect(vi.mocked(deleteSupplierAction)).not.toHaveBeenCalled();
  });

  it('shows multiple suppliers in table', () => {
    const suppliers = [
      makeSupplier({ id: SUPPLIER_UUID_1, name: 'Proveedor A' }),
      makeSupplier({ id: SUPPLIER_UUID_2, name: 'Proveedor B' }),
    ];
    render(<SuppliersPageClient suppliers={makeSuppliers(suppliers)} userRole="OWNER" />);
    expect(screen.getByText('Proveedor A')).toBeInTheDocument();
    expect(screen.getByText('Proveedor B')).toBeInTheDocument();
  });
});