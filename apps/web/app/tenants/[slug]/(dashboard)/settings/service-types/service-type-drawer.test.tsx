import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useActionState } from 'react';
import type { ServiceTypeResponse } from '@repo/types';
import type { ServiceTypeActionState } from '../../../../../actions/service-types';

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return { ...actual, useActionState: vi.fn() };
});

vi.mock('../../../../../actions/service-types', () => ({
  createServiceTypeAction: vi.fn(),
  updateServiceTypeAction: vi.fn(),
}));

import { ServiceTypeDrawer } from './service-type-drawer';

const mockServiceType: ServiceTypeResponse = {
  id: 'st-1',
  tenantId: 'tenant-1',
  name: 'Hemodiálisis',
  description: 'Sesión estándar',
  price: 1500,
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('ServiceTypeDrawer', () => {
  const mockDispatch = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useActionState<ServiceTypeActionState, FormData>).mockReturnValue([
      null,
      mockDispatch,
      false,
    ]);
  });

  it('renders create form when no serviceType prop is passed', () => {
    render(
      <ServiceTypeDrawer open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );
    expect(
      screen.getByRole('heading', { name: /nuevo tipo de servicio/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
  });

  it('renders edit form pre-filled when serviceType prop is passed', () => {
    render(
      <ServiceTypeDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        serviceType={mockServiceType}
      />,
    );
    expect(
      screen.getByRole('heading', { name: /editar tipo de servicio/i }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('Hemodiálisis')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Sesión estándar')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1500')).toBeInTheDocument();
  });

  it('shows "El nombre es obligatorio" when name is empty and form is submitted', async () => {
    render(
      <ServiceTypeDrawer open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );
    fireEvent.submit(screen.getByRole('form', { name: /nuevo tipo de servicio/i }));
    await waitFor(() => {
      expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument();
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('dispatches form data on valid submission', async () => {
    render(
      <ServiceTypeDrawer open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );
    fireEvent.change(screen.getByLabelText(/nombre/i), {
      target: { value: 'Diálisis peritoneal' },
    });
    fireEvent.submit(screen.getByRole('form', { name: /nuevo tipo de servicio/i }));
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  it('shows server error without closing the drawer', () => {
    vi.mocked(useActionState<ServiceTypeActionState, FormData>).mockReturnValue([
      { error: 'Ya existe un tipo de servicio con ese nombre' },
      mockDispatch,
      false,
    ]);
    render(
      <ServiceTypeDrawer open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );
    expect(
      screen.getByText('Ya existe un tipo de servicio con ese nombre'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /nuevo tipo de servicio/i }),
    ).toBeInTheDocument();
  });

  it('calls onSuccess after successful submission', async () => {
    vi.mocked(useActionState<ServiceTypeActionState, FormData>).mockReturnValue([
      null,
      mockDispatch,
      true,
    ]);
    const { rerender } = render(
      <ServiceTypeDrawer open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );

    vi.mocked(useActionState<ServiceTypeActionState, FormData>).mockReturnValue([
      null,
      mockDispatch,
      false,
    ]);
    rerender(
      <ServiceTypeDrawer open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('does not render when open is false', () => {
    render(
      <ServiceTypeDrawer open={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );
    expect(
      screen.queryByRole('heading', { name: /tipo de servicio/i }),
    ).not.toBeInTheDocument();
  });
});
