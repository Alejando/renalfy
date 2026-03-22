import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useActionState } from 'react';
import type { LocationResponse, PatientResponse } from '@repo/types';
import type { PatientActionState } from '../../../../actions/patients';

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return { ...actual, useActionState: vi.fn() };
});

vi.mock('../../../../actions/patients', () => ({
  createPatientAction: vi.fn(),
  updatePatientAction: vi.fn(),
}));

import { PatientDrawer } from './patient-drawer';

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

const mockPatient: PatientResponse = {
  id: 'patient-1',
  tenantId: 'tenant-1',
  locationId: 'loc-1',
  locationName: 'Sucursal Centro',
  name: 'Juan Pérez',
  birthDate: null,
  phone: '555-0001',
  mobile: '555-0002',
  address: 'Calle Falsa 123',
  notes: 'Sin notas',
  status: 'ACTIVE',
  hasConsent: true,
  consent: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('PatientDrawer', () => {
  const mockDispatch = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useActionState<PatientActionState, FormData>).mockReturnValue([
      null,
      mockDispatch,
      false,
    ]);
  });

  it('renders create form with consent section when no patient prop', () => {
    render(
      <PatientDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        userRole="OWNER"
        userLocationId={null}
        locations={mockLocations}
      />,
    );
    expect(screen.getByRole('heading', { name: /nuevo paciente/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/consentimiento/i)).toBeInTheDocument();
  });

  it('renders edit form with pre-filled editable fields and name as read-only text', () => {
    render(
      <PatientDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        patient={mockPatient}
        userRole="OWNER"
        userLocationId={null}
        locations={mockLocations}
      />,
    );
    expect(screen.getByRole('heading', { name: /editar paciente/i })).toBeInTheDocument();
    // Name shown as text, not editable
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^nombre/i)).not.toBeInTheDocument();
    // Editable fields pre-filled
    expect(screen.getByDisplayValue('555-0001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Calle Falsa 123')).toBeInTheDocument();
  });

  it('shows "El nombre es obligatorio" when name is empty on submit', async () => {
    render(
      <PatientDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        userRole="OWNER"
        userLocationId={null}
        locations={mockLocations}
      />,
    );
    fireEvent.submit(screen.getByRole('form', { name: /nuevo paciente/i }));
    await waitFor(() => {
      expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument();
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('shows "El consentimiento es obligatorio" when consent type is not selected', async () => {
    render(
      <PatientDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        userRole="OWNER"
        userLocationId={null}
        locations={mockLocations}
      />,
    );
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Ana López' } });
    // Submit without selecting consent type (default is empty)
    fireEvent.submit(screen.getByRole('form', { name: /nuevo paciente/i }));
    await waitFor(() => {
      expect(screen.getByText('El consentimiento es obligatorio')).toBeInTheDocument();
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('shows location selector for OWNER', () => {
    render(
      <PatientDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        userRole="OWNER"
        userLocationId={null}
        locations={mockLocations}
      />,
    );
    expect(screen.getByLabelText(/sucursal/i)).toBeInTheDocument();
  });

  it('does NOT show location selector for MANAGER', () => {
    render(
      <PatientDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        userRole="MANAGER"
        userLocationId="loc-1"
        locations={[]}
      />,
    );
    expect(screen.queryByLabelText(/sucursal/i)).not.toBeInTheDocument();
  });

  it('shows server error without closing the drawer', () => {
    vi.mocked(useActionState<PatientActionState, FormData>).mockReturnValue([
      { error: 'Paciente ya registrado' },
      mockDispatch,
      false,
    ]);
    render(
      <PatientDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        userRole="OWNER"
        userLocationId={null}
        locations={mockLocations}
      />,
    );
    expect(screen.getByText('Paciente ya registrado')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /nuevo paciente/i })).toBeInTheDocument();
  });

  it('calls onSuccess after successful submission', async () => {
    vi.mocked(useActionState<PatientActionState, FormData>).mockReturnValue([
      null,
      mockDispatch,
      true,
    ]);
    const { rerender } = render(
      <PatientDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        userRole="OWNER"
        userLocationId={null}
        locations={mockLocations}
      />,
    );

    vi.mocked(useActionState<PatientActionState, FormData>).mockReturnValue([
      null,
      mockDispatch,
      false,
    ]);
    rerender(
      <PatientDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        userRole="OWNER"
        userLocationId={null}
        locations={mockLocations}
      />,
    );

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('does not render when open is false', () => {
    render(
      <PatientDrawer
        open={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        userRole="OWNER"
        userLocationId={null}
        locations={mockLocations}
      />,
    );
    expect(screen.queryByRole('heading', { name: /paciente/i })).not.toBeInTheDocument();
  });

  it('closes on Escape key', async () => {
    render(
      <PatientDrawer
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        userRole="OWNER"
        userLocationId={null}
        locations={mockLocations}
      />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
