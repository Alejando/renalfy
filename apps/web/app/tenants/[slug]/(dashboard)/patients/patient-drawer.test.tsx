import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LocationResponse, PatientResponse } from '@repo/types';

vi.mock('../../../../actions/patients', () => ({
  createPatientAction: vi.fn(),
  updatePatientAction: vi.fn(),
}));

import { createPatientAction, updatePatientAction } from '../../../../actions/patients';
import { PatientDrawer } from './patient-drawer';

const LOC_ID = '11111111-1111-1111-8111-111111111111';
const TENANT_ID = '22222222-2222-2222-8222-222222222222';
const PATIENT_ID = '33333333-3333-3333-8333-333333333333';

const mockLocations: LocationResponse[] = [
  {
    id: LOC_ID,
    tenantId: TENANT_ID,
    name: 'Sucursal Centro',
    address: null,
    phone: null,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
];

const mockPatient: PatientResponse = {
  id: PATIENT_ID,
  tenantId: TENANT_ID,
  locationId: LOC_ID,
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
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createPatientAction).mockResolvedValue(null);
    vi.mocked(updatePatientAction).mockResolvedValue(null);
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

  it('shows validation error when name is empty on submit', async () => {
    const user = userEvent.setup();
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
    await user.click(screen.getByRole('button', { name: /crear paciente/i }));
    await waitFor(() => {
      expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument();
    });
    expect(createPatientAction).not.toHaveBeenCalled();
  });

  it('shows consent validation error when consent type is not selected', async () => {
    const user = userEvent.setup();
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
    await user.type(screen.getByLabelText(/nombre/i), 'Ana López');
    fireEvent.change(screen.getByLabelText(/sucursal/i), { target: { value: LOC_ID } });
    // Submit without selecting consent type
    await user.click(screen.getByRole('button', { name: /crear paciente/i }));
    await waitFor(() => {
      const error = screen.queryByText(/requerido|required|invalid/i);
      expect(error).toBeInTheDocument();
    });
    expect(createPatientAction).not.toHaveBeenCalled();
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

  it('shows server error without closing the drawer', async () => {
    const user = userEvent.setup();
    vi.mocked(createPatientAction).mockResolvedValue({ error: 'Paciente ya registrado' });
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
    await user.type(screen.getByLabelText(/nombre/i), 'Test');
    await user.selectOptions(screen.getByLabelText(/sucursal/i), LOC_ID);
    await user.selectOptions(screen.getByLabelText(/tipo de consentimiento/i), 'PRIVACY_NOTICE');
    await user.click(screen.getByRole('button', { name: /crear paciente/i }));
    await waitFor(() => {
      expect(screen.getByText('Paciente ya registrado')).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /nuevo paciente/i })).toBeInTheDocument();
  });

  it('calls onSuccess after successful submission', async () => {
    const user = userEvent.setup();
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
    await user.type(screen.getByLabelText(/nombre/i), 'Test Paciente');
    await user.selectOptions(screen.getByLabelText(/sucursal/i), LOC_ID);
    await user.selectOptions(screen.getByLabelText(/tipo de consentimiento/i), 'PRIVACY_NOTICE');
    await user.click(screen.getByRole('button', { name: /crear paciente/i }));
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('does not render content when open is false', () => {
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
});
