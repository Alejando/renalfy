import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SupplierResponse } from '@repo/types';

vi.mock('@/app/actions/suppliers', () => ({
  createSupplierAction: vi.fn(),
  updateSupplierAction: vi.fn(),
}));

import { createSupplierAction, updateSupplierAction } from '@/app/actions/suppliers';
import { SupplierForm } from './supplier-form';

const SUPPLIER_UUID = '11111111-1111-4111-8111-111111111111';
const TENANT_UUID = '22222222-2222-4222-8222-222222222222';

const mockSupplier: SupplierResponse = {
  id: SUPPLIER_UUID,
  tenantId: TENANT_UUID,
  name: 'Distribuidora Médica del Norte',
  initials: 'DMN',
  contact: 'Juan Pérez',
  phone: '5551234567',
  email: 'contacto@distribuidora.com',
  address: 'Av. Industrial 500',
  notes: 'Proveedor de consumibles médicos',
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('SupplierForm', () => {
  const onSuccess = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all required and optional fields', () => {
    render(<SupplierForm onSuccess={onSuccess} onClose={onClose} />);
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/siglas/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contacto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dirección/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notas/i)).toBeInTheDocument();
  });

  it('shows "Crear Proveedor" button in create mode', () => {
    render(<SupplierForm onSuccess={onSuccess} onClose={onClose} />);
    expect(screen.getByRole('button', { name: /crear proveedor/i })).toBeInTheDocument();
  });

  it('shows "Guardar Cambios" button in edit mode', () => {
    render(<SupplierForm onSuccess={onSuccess} onClose={onClose} supplier={mockSupplier} />);
    expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeInTheDocument();
  });

  it('pre-fills fields with supplier data in edit mode', () => {
    render(<SupplierForm onSuccess={onSuccess} onClose={onClose} supplier={mockSupplier} />);
    expect(screen.getByDisplayValue('Distribuidora Médica del Norte')).toBeInTheDocument();
    expect(screen.getByDisplayValue('DMN')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5551234567')).toBeInTheDocument();
  });

  it('shows validation error when name is empty on submit', async () => {
    render(<SupplierForm onSuccess={onSuccess} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /crear proveedor/i }));
    await waitFor(() => {
      expect(screen.getByText(/obligatorio/i)).toBeInTheDocument();
    });
    expect(vi.mocked(createSupplierAction)).not.toHaveBeenCalled();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<SupplierForm onSuccess={onSuccess} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls createSupplierAction with form data on submit (create mode)', async () => {
    const user = userEvent.setup();
    vi.mocked(createSupplierAction).mockResolvedValueOnce(null);
    render(<SupplierForm onSuccess={onSuccess} onClose={onClose} />);
    await user.clear(screen.getByLabelText(/nombre/i));
    await user.type(screen.getByLabelText(/nombre/i), 'Nuevo Proveedor');
    await user.click(screen.getByRole('button', { name: /crear proveedor/i }));
    await waitFor(() => {
      expect(vi.mocked(createSupplierAction)).toHaveBeenCalled();
    });
  });

  it('calls updateSupplierAction with form data on submit (edit mode)', async () => {
    const user = userEvent.setup();
    vi.mocked(updateSupplierAction).mockResolvedValueOnce(null);
    render(<SupplierForm onSuccess={onSuccess} onClose={onClose} supplier={mockSupplier} />);
    await user.clear(screen.getByLabelText(/nombre/i));
    await user.type(screen.getByLabelText(/nombre/i), 'Proveedor Editado');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));
    await waitFor(() => {
      expect(vi.mocked(updateSupplierAction)).toHaveBeenCalled();
    });
  });

  it('calls onSuccess after successful submission', async () => {
    const user = userEvent.setup();
    vi.mocked(createSupplierAction).mockResolvedValueOnce(null);
    render(<SupplierForm onSuccess={onSuccess} onClose={onClose} />);
    await user.clear(screen.getByLabelText(/nombre/i));
    await user.type(screen.getByLabelText(/nombre/i), 'Nuevo Proveedor');
    await user.click(screen.getByRole('button', { name: /crear proveedor/i }));
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('shows server error when action returns an error', async () => {
    const user = userEvent.setup();
    vi.mocked(createSupplierAction).mockResolvedValueOnce({ error: 'Error del servidor' });
    render(<SupplierForm onSuccess={onSuccess} onClose={onClose} />);
    await user.clear(screen.getByLabelText(/nombre/i));
    await user.type(screen.getByLabelText(/nombre/i), 'Nuevo Proveedor');
    await user.click(screen.getByRole('button', { name: /crear proveedor/i }));
    await waitFor(() => {
      expect(screen.getByText(/error del servidor/i)).toBeInTheDocument();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });
});