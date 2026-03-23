import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { LocationResponse, ServiceTypeResponse } from '@repo/types';

vi.mock('../../../../actions/appointments', () => ({
  createAppointmentAction: vi.fn(),
  fetchClinicalTemplateByServiceTypeAction: vi.fn().mockResolvedValue(null),
}));

import { AppointmentForm } from './appointment-form';

const LOC_UUID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const TENANT_UUID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const SVC_UUID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const PATIENT_UUID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const mockLocation: LocationResponse = {
  id: LOC_UUID,
  tenantId: TENANT_UUID,
  name: 'Sucursal Centro',
  address: 'Calle Principal 1',
  phone: null,
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockServiceType: ServiceTypeResponse = {
  id: SVC_UUID,
  tenantId: TENANT_UUID,
  name: 'Hemodiálisis',
  description: null,
  price: 500,
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

interface MockPatient {
  id: string;
  name: string;
}

const mockPatients: MockPatient[] = [{ id: PATIENT_UUID, name: 'Juan Pérez' }];

describe('AppointmentForm', () => {
  const onSuccess = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders required fields', () => {
    render(
      <AppointmentForm
        onSuccess={onSuccess}
        onClose={onClose}
        locations={[mockLocation]}
        serviceTypes={[mockServiceType]}
        patients={mockPatients}
        userLocationId={LOC_UUID}
        userRole="STAFF"
      />,
    );
    expect(screen.getByLabelText(/paciente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha y hora/i)).toBeInTheDocument();
  });

  it('renders service type selector', () => {
    render(
      <AppointmentForm
        onSuccess={onSuccess}
        onClose={onClose}
        locations={[mockLocation]}
        serviceTypes={[mockServiceType]}
        patients={mockPatients}
        userLocationId={LOC_UUID}
        userRole="STAFF"
      />,
    );
    expect(screen.getByLabelText(/tipo de servicio/i)).toBeInTheDocument();
  });

  it('renders submit and cancel buttons', () => {
    render(
      <AppointmentForm
        onSuccess={onSuccess}
        onClose={onClose}
        locations={[mockLocation]}
        serviceTypes={[mockServiceType]}
        patients={mockPatients}
        userLocationId={LOC_UUID}
        userRole="STAFF"
      />,
    );
    expect(screen.getByRole('button', { name: /crear cita/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(
      <AppointmentForm
        onSuccess={onSuccess}
        onClose={onClose}
        locations={[mockLocation]}
        serviceTypes={[mockServiceType]}
        patients={mockPatients}
        userLocationId={LOC_UUID}
        userRole="STAFF"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows validation errors when submitting without required fields', async () => {
    render(
      <AppointmentForm
        onSuccess={onSuccess}
        onClose={onClose}
        locations={[mockLocation]}
        serviceTypes={[mockServiceType]}
        patients={mockPatients}
        userLocationId={LOC_UUID}
        userRole="STAFF"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /crear cita/i }));
    await waitFor(() => {
      const errors = document.querySelectorAll('.text-destructive');
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
