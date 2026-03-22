import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useActionState } from 'react';
import type { LocationResponse, UserResponse } from '@repo/types';
import type { UserActionState } from '../../../../../actions/users';

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return { ...actual, useActionState: vi.fn() };
});

vi.mock('../../../../../actions/users', () => ({
  createUserAction: vi.fn(),
  updateUserAction: vi.fn(),
}));

import { UserDrawer } from './user-drawer';

const mockLocations: LocationResponse[] = [
  {
    id: 'loc-1',
    tenantId: 'tenant-1',
    name: 'Sucursal Centro',
    address: null,
    phone: null,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
];

const mockUser: UserResponse = {
  id: 'user-1',
  tenantId: 'tenant-1',
  locationId: 'loc-1',
  name: 'Ana García',
  email: 'ana@clinica.com',
  role: 'STAFF',
  status: 'ACTIVE',
  phone: '555-0001',
  avatarUrl: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('UserDrawer', () => {
  const mockDispatch = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useActionState<UserActionState, FormData>).mockReturnValue([
      null,
      mockDispatch,
      false,
    ]);
  });

  it('renders create form with password field when no user prop', () => {
    render(
      <UserDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        locations={mockLocations}
      />,
    );
    expect(screen.getByRole('heading', { name: /nuevo usuario/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('does NOT render password field when user prop is passed (edit mode)', () => {
    render(
      <UserDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        locations={mockLocations}
        user={mockUser}
      />,
    );
    expect(screen.getByRole('heading', { name: /editar usuario/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/contraseña/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });

  it('shows "La sucursal es obligatoria" when role is MANAGER and no location selected', async () => {
    render(
      <UserDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        locations={mockLocations}
      />,
    );
    // Select MANAGER role
    fireEvent.change(screen.getByLabelText(/rol/i), { target: { value: 'MANAGER' } });
    // Clear location selection
    fireEvent.change(screen.getByLabelText(/sucursal/i), { target: { value: '' } });
    // Submit with empty name to trigger validation
    fireEvent.change(screen.getByLabelText(/nombre completo/i), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: 'password123' },
    });
    fireEvent.submit(screen.getByRole('form', { name: /nuevo usuario/i }));
    await waitFor(() => {
      expect(screen.getByText(/la sucursal es obligatoria/i)).toBeInTheDocument();
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('hides location field when role is OWNER', () => {
    render(
      <UserDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        locations={mockLocations}
      />,
    );
    fireEvent.change(screen.getByLabelText(/rol/i), { target: { value: 'OWNER' } });
    expect(screen.queryByLabelText(/sucursal/i)).not.toBeInTheDocument();
  });

  it('hides location field when role is ADMIN', () => {
    render(
      <UserDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        locations={mockLocations}
      />,
    );
    fireEvent.change(screen.getByLabelText(/rol/i), { target: { value: 'ADMIN' } });
    expect(screen.queryByLabelText(/sucursal/i)).not.toBeInTheDocument();
  });

  it('calls createUserAction dispatch on valid create submission', async () => {
    render(
      <UserDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        locations={mockLocations}
      />,
    );
    fireEvent.change(screen.getByLabelText(/nombre completo/i), {
      target: { value: 'Carlos Pérez' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'carlos@clinica.com' },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: 'securepassword' },
    });
    fireEvent.change(screen.getByLabelText(/rol/i), { target: { value: 'ADMIN' } });
    fireEvent.submit(screen.getByRole('form', { name: /nuevo usuario/i }));
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  it('calls updateUserAction dispatch on valid edit submission', async () => {
    render(
      <UserDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        locations={mockLocations}
        user={mockUser}
      />,
    );
    fireEvent.submit(screen.getByRole('form', { name: /editar usuario/i }));
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  it('shows API error message inside drawer without closing', () => {
    vi.mocked(useActionState<UserActionState, FormData>).mockReturnValue([
      { error: 'Ya existe un usuario con ese correo' },
      mockDispatch,
      false,
    ]);
    render(
      <UserDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        locations={mockLocations}
      />,
    );
    expect(screen.getByText('Ya existe un usuario con ese correo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /nuevo usuario/i })).toBeInTheDocument();
  });

  it('calls onSuccess after submission completes successfully', async () => {
    vi.mocked(useActionState<UserActionState, FormData>).mockReturnValue([
      null,
      mockDispatch,
      true,
    ]);
    const { rerender } = render(
      <UserDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        locations={mockLocations}
      />,
    );

    vi.mocked(useActionState<UserActionState, FormData>).mockReturnValue([
      null,
      mockDispatch,
      false,
    ]);
    rerender(
      <UserDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        locations={mockLocations}
      />,
    );

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('does not render when open is false', () => {
    render(
      <UserDrawer
        open={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        locations={mockLocations}
      />,
    );
    expect(screen.queryByRole('heading', { name: /usuario/i })).not.toBeInTheDocument();
  });
});
