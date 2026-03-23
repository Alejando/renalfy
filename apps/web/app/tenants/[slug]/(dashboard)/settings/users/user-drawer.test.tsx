import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LocationResponse, UserResponse } from '@repo/types';

vi.mock('../../../../../actions/users', () => ({
  createUserAction: vi.fn(),
  updateUserAction: vi.fn(),
}));

import { createUserAction, updateUserAction } from '../../../../../actions/users';
import { UserDrawer } from './user-drawer';

const mockLocations: LocationResponse[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    tenantId: '22222222-2222-2222-2222-222222222222',
    name: 'Sucursal Centro',
    address: null,
    phone: null,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
];

const mockUser: UserResponse = {
  id: '44444444-4444-4444-4444-444444444444',
  tenantId: '22222222-2222-2222-2222-222222222222',
  locationId: '11111111-1111-1111-1111-111111111111',
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
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createUserAction).mockResolvedValue(null);
    vi.mocked(updateUserAction).mockResolvedValue(null);
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
    const user = userEvent.setup();
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
    await waitFor(() => {
      expect(screen.getByLabelText(/sucursal/i)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/sucursal/i), { target: { value: '' } });
    // Fill required fields
    await user.type(screen.getByLabelText(/nombre completo/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'password123');
    await user.click(screen.getByRole('button', { name: /crear usuario/i }));
    await waitFor(() => {
      expect(screen.getByText(/la sucursal es obligatoria/i)).toBeInTheDocument();
    });
    expect(createUserAction).not.toHaveBeenCalled();
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

  it('calls createUserAction on valid create submission', async () => {
    const user = userEvent.setup();
    render(
      <UserDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        locations={mockLocations}
      />,
    );
    await user.type(screen.getByLabelText(/nombre completo/i), 'Carlos Pérez');
    await user.type(screen.getByLabelText(/email/i), 'carlos@clinica.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'securepassword');
    fireEvent.change(screen.getByLabelText(/rol/i), { target: { value: 'ADMIN' } });
    await user.click(screen.getByRole('button', { name: /crear usuario/i }));
    await waitFor(() => {
      expect(createUserAction).toHaveBeenCalledWith(null, expect.any(FormData));
    });
  });

  it('calls updateUserAction on valid edit submission', async () => {
    const user = userEvent.setup();
    render(
      <UserDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        locations={mockLocations}
        user={mockUser}
      />,
    );
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));
    await waitFor(() => {
      expect(updateUserAction).toHaveBeenCalledWith(null, expect.any(FormData));
    });
  });

  it('shows API error message inside drawer without closing', async () => {
    const user = userEvent.setup();
    vi.mocked(createUserAction).mockResolvedValue({
      error: 'Ya existe un usuario con ese correo',
    });
    render(
      <UserDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        locations={mockLocations}
      />,
    );
    await user.type(screen.getByLabelText(/nombre completo/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@clinica.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'password123');
    await user.click(screen.getByRole('button', { name: /crear usuario/i }));
    await waitFor(() => {
      expect(screen.getByText('Ya existe un usuario con ese correo')).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /nuevo usuario/i })).toBeInTheDocument();
  });

  it('calls onSuccess after successful create submission', async () => {
    const user = userEvent.setup();
    render(
      <UserDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        locations={mockLocations}
      />,
    );
    await user.type(screen.getByLabelText(/nombre completo/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@clinica.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'password123');
    await user.click(screen.getByRole('button', { name: /crear usuario/i }));
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('does not render content when open is false', () => {
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
