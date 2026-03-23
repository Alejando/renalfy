import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { LocationResponse, ServiceTypeResponse } from '@repo/types';

vi.mock('../../../../actions/receipts', () => ({
  createReceiptAction: vi.fn(),
}));

import { createReceiptAction } from '../../../../actions/receipts';
import { ReceiptForm } from './receipt-form';

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

describe('ReceiptForm', () => {
  const onSuccess = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders required fields', () => {
    render(
      <ReceiptForm
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
    expect(screen.getByLabelText(/monto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tipo de pago/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha/i)).toBeInTheDocument();
  });

  it('does not show plan field when payment type is CASH', () => {
    render(
      <ReceiptForm
        onSuccess={onSuccess}
        onClose={onClose}
        locations={[mockLocation]}
        serviceTypes={[mockServiceType]}
        patients={mockPatients}
        userLocationId={LOC_UUID}
        userRole="STAFF"
      />,
    );
    expect(screen.queryByLabelText(/plan/i)).not.toBeInTheDocument();
  });

  it('shows plan field when payment type is BENEFIT', async () => {
    render(
      <ReceiptForm
        onSuccess={onSuccess}
        onClose={onClose}
        locations={[mockLocation]}
        serviceTypes={[mockServiceType]}
        patients={mockPatients}
        userLocationId={LOC_UUID}
        userRole="STAFF"
      />,
    );
    const paymentTypeSelect = screen.getByLabelText(/tipo de pago/i);
    fireEvent.change(paymentTypeSelect, { target: { value: 'BENEFIT' } });
    await waitFor(() => {
      expect(screen.getByLabelText(/plan/i)).toBeInTheDocument();
    });
  });

  it('shows error when submitting BENEFIT without planId', async () => {
    render(
      <ReceiptForm
        onSuccess={onSuccess}
        onClose={onClose}
        locations={[mockLocation]}
        serviceTypes={[mockServiceType]}
        patients={mockPatients}
        userLocationId={LOC_UUID}
        userRole="STAFF"
      />,
    );

    // Select BENEFIT payment type
    fireEvent.change(screen.getByLabelText(/tipo de pago/i), {
      target: { value: 'BENEFIT' },
    });

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/monto/i), {
      target: { value: '500.00' },
    });
    fireEvent.change(screen.getByLabelText(/fecha/i), {
      target: { value: '2026-03-22' },
    });

    // Select a patient
    fireEvent.change(screen.getByLabelText(/paciente/i), {
      target: { value: PATIENT_UUID },
    });

    fireEvent.click(screen.getByRole('button', { name: /crear recibo/i }));

    await waitFor(() => {
      expect(screen.getByText(/plan es requerido/i)).toBeInTheDocument();
    });
    expect(vi.mocked(createReceiptAction)).not.toHaveBeenCalled();
  });

  it('renders submit button initially enabled', () => {
    render(
      <ReceiptForm
        onSuccess={onSuccess}
        onClose={onClose}
        locations={[mockLocation]}
        serviceTypes={[mockServiceType]}
        patients={mockPatients}
        userLocationId={LOC_UUID}
        userRole="STAFF"
      />,
    );

    expect(screen.getByRole('button', { name: /crear recibo/i })).not.toBeDisabled();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(
      <ReceiptForm
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

  it('shows validation errors when submitting without filling required fields', async () => {
    render(
      <ReceiptForm
        onSuccess={onSuccess}
        onClose={onClose}
        locations={[mockLocation]}
        serviceTypes={[mockServiceType]}
        patients={mockPatients}
        userLocationId={LOC_UUID}
        userRole="STAFF"
      />,
    );

    // Submit without filling any fields
    fireEvent.click(screen.getByRole('button', { name: /crear recibo/i }));

    // Expect validation errors to appear
    await waitFor(() => {
      // Should show at least one validation error (patientId, amount or date)
      const errors = document.querySelectorAll('.text-destructive');
      expect(errors.length).toBeGreaterThan(0);
    });
    expect(vi.mocked(createReceiptAction)).not.toHaveBeenCalled();
  });
});
