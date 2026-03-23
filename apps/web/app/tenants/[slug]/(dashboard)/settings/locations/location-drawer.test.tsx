import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LocationResponse } from '@repo/types';

vi.mock('../../../../../actions/locations', () => ({
  createLocationAction: vi.fn(),
  updateLocationAction: vi.fn(),
}));

import { createLocationAction, updateLocationAction } from '../../../../../actions/locations';
import { LocationDrawer } from './location-drawer';

const mockLocation: LocationResponse = {
  id: 'loc-1',
  tenantId: 'tenant-1',
  name: 'Sucursal Centro',
  address: 'Av. Principal 123',
  phone: '555-0001',
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('LocationDrawer', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createLocationAction).mockResolvedValue(null);
    vi.mocked(updateLocationAction).mockResolvedValue(null);
  });

  it('renders create form when no location prop is passed', () => {
    render(
      <LocationDrawer open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );
    expect(screen.getByRole('heading', { name: /nueva sucursal/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Sucursal Centro')).not.toBeInTheDocument();
  });

  it('renders edit form pre-filled when location prop is passed', () => {
    render(
      <LocationDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        location={mockLocation}
      />,
    );
    expect(screen.getByRole('heading', { name: /editar sucursal/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Sucursal Centro')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Av. Principal 123')).toBeInTheDocument();
  });

  it('shows validation error when name is empty and form is submitted', async () => {
    const user = userEvent.setup();
    render(
      <LocationDrawer open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );
    await user.click(screen.getByRole('button', { name: /crear sucursal/i }));
    await waitFor(() => {
      const errorEl = screen.queryByText(/obligatorio|requerido|least 1/i);
      expect(errorEl).toBeInTheDocument();
    });
    expect(createLocationAction).not.toHaveBeenCalled();
  });

  it('calls createLocationAction with form data on valid create submission', async () => {
    const user = userEvent.setup();
    render(
      <LocationDrawer open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );
    await user.type(screen.getByLabelText(/nombre/i), 'Nueva Sucursal');
    await user.click(screen.getByRole('button', { name: /crear sucursal/i }));
    await waitFor(() => {
      expect(createLocationAction).toHaveBeenCalledWith(null, expect.any(FormData));
    });
  });

  it('calls updateLocationAction with form data on valid edit submission', async () => {
    const user = userEvent.setup();
    render(
      <LocationDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        location={mockLocation}
      />,
    );
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));
    await waitFor(() => {
      expect(updateLocationAction).toHaveBeenCalledWith(null, expect.any(FormData));
    });
  });

  it('shows error message from action when action returns { error }', async () => {
    const user = userEvent.setup();
    vi.mocked(createLocationAction).mockResolvedValue({ error: 'Error al crear sucursal' });
    render(
      <LocationDrawer open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );
    await user.type(screen.getByLabelText(/nombre/i), 'Nueva Sucursal');
    await user.click(screen.getByRole('button', { name: /crear sucursal/i }));
    await waitFor(() => {
      expect(screen.getByText('Error al crear sucursal')).toBeInTheDocument();
    });
  });

  it('calls onSuccess after successful submission', async () => {
    const user = userEvent.setup();
    render(
      <LocationDrawer open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );
    await user.type(screen.getByLabelText(/nombre/i), 'Nueva Sucursal');
    await user.click(screen.getByRole('button', { name: /crear sucursal/i }));
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('does not render content when open is false', () => {
    render(
      <LocationDrawer open={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );
    expect(screen.queryByRole('heading', { name: /sucursal/i })).not.toBeInTheDocument();
  });
});
