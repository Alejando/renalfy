import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { TemplateField } from '@repo/types';

vi.mock('../../../../actions/appointments', () => ({
  createMeasurementAction: vi.fn(),
}));

import { createMeasurementAction } from '../../../../actions/appointments';
import { AppointmentMeasurementForm } from './appointment-measurement-form';

describe('AppointmentMeasurementForm', () => {
  const onSuccess = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders date/time field and submit button', () => {
    render(
      <AppointmentMeasurementForm
        appointmentId="appt-1"
        templateFields={[]}
        onSuccess={onSuccess}
        onClose={onClose}
      />,
    );
    expect(screen.getByLabelText(/fecha y hora de medición/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrar medición/i })).toBeInTheDocument();
  });

  it('renders dynamic fields from template', () => {
    const fields: TemplateField[] = [
      { key: 'weight', label: 'Peso (kg)', type: 'number', required: true },
      { key: 'bp', label: 'Presión arterial', type: 'text', required: true },
    ];
    render(
      <AppointmentMeasurementForm
        appointmentId="appt-1"
        templateFields={fields}
        onSuccess={onSuccess}
        onClose={onClose}
      />,
    );
    expect(screen.getByLabelText(/peso \(kg\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/presión arterial/i)).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', () => {
    render(
      <AppointmentMeasurementForm
        appointmentId="appt-1"
        templateFields={[]}
        onSuccess={onSuccess}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls createMeasurementAction on submit with recordedAt', async () => {
    vi.mocked(createMeasurementAction).mockResolvedValue({
      measurement: {
        id: 'meas-1',
        tenantId: 'tenant-1',
        appointmentId: 'appt-1',
        recordedAt: new Date(),
        data: {},
        notes: null,
      },
    });

    render(
      <AppointmentMeasurementForm
        appointmentId="appt-1"
        templateFields={[]}
        onSuccess={onSuccess}
        onClose={onClose}
      />,
    );

    fireEvent.change(screen.getByLabelText(/fecha y hora de medición/i), {
      target: { value: '2026-03-22T10:00' },
    });

    fireEvent.click(screen.getByRole('button', { name: /registrar medición/i }));

    await waitFor(() => {
      expect(createMeasurementAction).toHaveBeenCalledWith(
        'appt-1',
        expect.any(FormData),
      );
    });
  });

  it('shows error when action fails', async () => {
    vi.mocked(createMeasurementAction).mockResolvedValue({
      error: 'Error al registrar',
    });

    render(
      <AppointmentMeasurementForm
        appointmentId="appt-1"
        templateFields={[]}
        onSuccess={onSuccess}
        onClose={onClose}
      />,
    );

    fireEvent.change(screen.getByLabelText(/fecha y hora de medición/i), {
      target: { value: '2026-03-22T10:00' },
    });

    fireEvent.click(screen.getByRole('button', { name: /registrar medición/i }));

    await waitFor(() => {
      expect(screen.getByText('Error al registrar')).toBeInTheDocument();
    });
  });
});
