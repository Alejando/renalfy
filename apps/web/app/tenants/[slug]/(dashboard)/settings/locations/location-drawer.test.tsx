import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useActionState } from 'react';
import type { LocationResponse } from '@repo/types';
import type { LocationActionState } from '../../../../../actions/locations';

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return { ...actual, useActionState: vi.fn() };
});

vi.mock('../../../../../actions/locations', () => ({
  createLocationAction: vi.fn(),
  updateLocationAction: vi.fn(),
}));

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
  const mockDispatch = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useActionState<LocationActionState, FormData>).mockReturnValue([
      null,
      mockDispatch,
      false,
    ]);
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

  it('shows "El nombre es obligatorio" when name is empty and form is submitted', async () => {
    render(
      <LocationDrawer open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );
    // Form starts with empty name — submit directly
    fireEvent.submit(screen.getByRole('form', { name: /nueva sucursal/i }));
    await waitFor(() => {
      expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument();
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('calls createLocationAction dispatch with form data on valid create submission', async () => {
    render(
      <LocationDrawer open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );
    fireEvent.change(screen.getByLabelText(/nombre/i), {
      target: { value: 'Nueva Sucursal' },
    });
    fireEvent.submit(screen.getByRole('form', { name: /nueva sucursal/i }));
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  it('calls updateLocationAction dispatch with form data on valid edit submission', async () => {
    render(
      <LocationDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        location={mockLocation}
      />,
    );
    fireEvent.submit(screen.getByRole('form', { name: /editar sucursal/i }));
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  it('shows error message from action state when action returns { error }', () => {
    vi.mocked(useActionState<LocationActionState, FormData>).mockReturnValue([
      { error: 'Error al crear sucursal' },
      mockDispatch,
      false,
    ]);
    render(
      <LocationDrawer open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );
    expect(screen.getByText('Error al crear sucursal')).toBeInTheDocument();
  });

  it('calls onSuccess after submission completes successfully', async () => {
    // First render: isPending=true (submission in progress)
    vi.mocked(useActionState<LocationActionState, FormData>).mockReturnValue([
      null,
      mockDispatch,
      true,
    ]);
    const { rerender } = render(
      <LocationDrawer open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );

    // Second render: isPending=false, state=null (success)
    vi.mocked(useActionState<LocationActionState, FormData>).mockReturnValue([
      null,
      mockDispatch,
      false,
    ]);
    rerender(
      <LocationDrawer open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('does not render when open is false', () => {
    render(
      <LocationDrawer open={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );
    expect(screen.queryByRole('heading', { name: /sucursal/i })).not.toBeInTheDocument();
  });
});
