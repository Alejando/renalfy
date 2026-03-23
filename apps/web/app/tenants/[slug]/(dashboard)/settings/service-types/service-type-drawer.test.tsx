import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ServiceTypeResponse } from '@repo/types';

vi.mock('../../../../../actions/service-types', () => ({
  createServiceTypeAction: vi.fn(),
  updateServiceTypeAction: vi.fn(),
}));

import {
  createServiceTypeAction,
  updateServiceTypeAction,
} from '../../../../../actions/service-types';
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
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServiceTypeAction).mockResolvedValue(null);
    vi.mocked(updateServiceTypeAction).mockResolvedValue(null);
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

  it('shows validation error when name is empty and form is submitted', async () => {
    const user = userEvent.setup();
    render(
      <ServiceTypeDrawer open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );
    await user.click(screen.getByRole('button', { name: /crear tipo de servicio/i }));
    await waitFor(() => {
      const error = screen.queryByText(/obligatorio|required|least 1/i);
      expect(error).toBeInTheDocument();
    });
    expect(createServiceTypeAction).not.toHaveBeenCalled();
  });

  it('calls createServiceTypeAction on valid submission', async () => {
    const user = userEvent.setup();
    render(
      <ServiceTypeDrawer open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );
    await user.type(screen.getByLabelText(/nombre/i), 'Diálisis peritoneal');
    await user.click(screen.getByRole('button', { name: /crear tipo de servicio/i }));
    await waitFor(() => {
      expect(createServiceTypeAction).toHaveBeenCalledWith(null, expect.any(FormData));
    });
  });

  it('shows server error without closing the drawer', async () => {
    const user = userEvent.setup();
    vi.mocked(createServiceTypeAction).mockResolvedValue({
      error: 'Ya existe un tipo de servicio con ese nombre',
    });
    render(
      <ServiceTypeDrawer open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );
    await user.type(screen.getByLabelText(/nombre/i), 'Hemodiálisis');
    await user.click(screen.getByRole('button', { name: /crear tipo de servicio/i }));
    await waitFor(() => {
      expect(
        screen.getByText('Ya existe un tipo de servicio con ese nombre'),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('heading', { name: /nuevo tipo de servicio/i }),
    ).toBeInTheDocument();
  });

  it('calls onSuccess after successful submission', async () => {
    const user = userEvent.setup();
    render(
      <ServiceTypeDrawer open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );
    await user.type(screen.getByLabelText(/nombre/i), 'Diálisis peritoneal');
    await user.click(screen.getByRole('button', { name: /crear tipo de servicio/i }));
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('does not render content when open is false', () => {
    render(
      <ServiceTypeDrawer open={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );
    expect(
      screen.queryByRole('heading', { name: /tipo de servicio/i }),
    ).not.toBeInTheDocument();
  });
});
