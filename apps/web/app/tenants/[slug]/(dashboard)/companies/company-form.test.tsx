import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CompanyResponse } from '@repo/types';

vi.mock('../../../../actions/companies', () => ({
  createCompanyAction: vi.fn(),
  updateCompanyAction: vi.fn(),
}));

import { createCompanyAction, updateCompanyAction } from '../../../../actions/companies';
import { CompanyForm } from './company-form';

const COMPANY_UUID = '11111111-1111-4111-8111-111111111111';
const TENANT_UUID = '22222222-2222-4222-8222-222222222222';

const mockCompany: CompanyResponse = {
  id: COMPANY_UUID,
  tenantId: TENANT_UUID,
  name: 'Seguros Vida Plena',
  taxId: 'SVP123456ABC',
  phone: '5551234567',
  email: 'contacto@svp.com',
  address: 'Av. Reforma 100',
  contactPerson: 'María García',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('CompanyForm', () => {
  const onSuccess = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all required and optional fields', () => {
    render(<CompanyForm onSuccess={onSuccess} onClose={onClose} />);
    expect(screen.getByLabelText(/nombre de empresa/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rfc/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contacto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dirección/i)).toBeInTheDocument();
  });

  it('shows "Crear Empresa" button in create mode', () => {
    render(<CompanyForm onSuccess={onSuccess} onClose={onClose} />);
    expect(screen.getByRole('button', { name: /crear empresa/i })).toBeInTheDocument();
  });

  it('shows "Guardar Cambios" button in edit mode', () => {
    render(<CompanyForm onSuccess={onSuccess} onClose={onClose} company={mockCompany} />);
    expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeInTheDocument();
  });

  it('pre-fills fields with company data in edit mode', () => {
    render(<CompanyForm onSuccess={onSuccess} onClose={onClose} company={mockCompany} />);
    expect(screen.getByDisplayValue('Seguros Vida Plena')).toBeInTheDocument();
    expect(screen.getByDisplayValue('SVP123456ABC')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5551234567')).toBeInTheDocument();
  });

  it('shows validation error when name is empty on submit', async () => {
    render(<CompanyForm onSuccess={onSuccess} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /crear empresa/i }));
    await waitFor(() => {
      expect(screen.getByText(/obligatorio/i)).toBeInTheDocument();
    });
    expect(vi.mocked(createCompanyAction)).not.toHaveBeenCalled();
  });

  it('shows validation error when email format is invalid', async () => {
    render(<CompanyForm onSuccess={onSuccess} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/nombre de empresa/i), {
      target: { value: 'Empresa Test' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: /crear empresa/i }));
    await waitFor(() => {
      const errors = document.querySelectorAll('.text-destructive');
      expect(errors.length).toBeGreaterThan(0);
    });
    expect(vi.mocked(createCompanyAction)).not.toHaveBeenCalled();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<CompanyForm onSuccess={onSuccess} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls createCompanyAction with form data on submit (create mode)', async () => {
    const user = userEvent.setup();
    vi.mocked(createCompanyAction).mockResolvedValueOnce(null);
    render(<CompanyForm onSuccess={onSuccess} onClose={onClose} />);
    await user.clear(screen.getByLabelText(/nombre de empresa/i));
    await user.type(screen.getByLabelText(/nombre de empresa/i), 'Nueva Empresa');
    await user.click(screen.getByRole('button', { name: /crear empresa/i }));
    await waitFor(() => {
      expect(vi.mocked(createCompanyAction)).toHaveBeenCalled();
    });
  });

  it('calls updateCompanyAction with form data on submit (edit mode)', async () => {
    const user = userEvent.setup();
    vi.mocked(updateCompanyAction).mockResolvedValueOnce(null);
    render(<CompanyForm onSuccess={onSuccess} onClose={onClose} company={mockCompany} />);
    await user.clear(screen.getByLabelText(/nombre de empresa/i));
    await user.type(screen.getByLabelText(/nombre de empresa/i), 'Empresa Editada');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));
    await waitFor(() => {
      expect(vi.mocked(updateCompanyAction)).toHaveBeenCalled();
    });
  });

  it('calls onSuccess after successful submission', async () => {
    const user = userEvent.setup();
    vi.mocked(createCompanyAction).mockResolvedValueOnce(null);
    render(<CompanyForm onSuccess={onSuccess} onClose={onClose} />);
    await user.clear(screen.getByLabelText(/nombre de empresa/i));
    await user.type(screen.getByLabelText(/nombre de empresa/i), 'Nueva Empresa');
    await user.click(screen.getByRole('button', { name: /crear empresa/i }));
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('shows server error when action returns an error', async () => {
    const user = userEvent.setup();
    vi.mocked(createCompanyAction).mockResolvedValueOnce({ error: 'Error del servidor' });
    render(<CompanyForm onSuccess={onSuccess} onClose={onClose} />);
    await user.clear(screen.getByLabelText(/nombre de empresa/i));
    await user.type(screen.getByLabelText(/nombre de empresa/i), 'Nueva Empresa');
    await user.click(screen.getByRole('button', { name: /crear empresa/i }));
    await waitFor(() => {
      expect(screen.getByText(/error del servidor/i)).toBeInTheDocument();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
