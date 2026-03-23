import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../../../actions/appointments', () => ({
  updateAppointmentStatusAction: vi.fn(),
}));

import { updateAppointmentStatusAction } from '../../../../actions/appointments';
import { AppointmentStatusTransitionDrawer } from './appointment-status-transition-drawer';

describe('AppointmentStatusTransitionDrawer', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render content when closed', () => {
    const { container } = render(
      <AppointmentStatusTransitionDrawer
        open={false}
        onClose={onClose}
        onSuccess={onSuccess}
        appointmentId="appt-1"
        currentStatus="SCHEDULED"
      />,
    );
    expect(container).toBeInTheDocument();
  });

  it('shows valid transition buttons for SCHEDULED status', () => {
    render(
      <AppointmentStatusTransitionDrawer
        open={true}
        onClose={onClose}
        onSuccess={onSuccess}
        appointmentId="appt-1"
        currentStatus="SCHEDULED"
      />,
    );
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar cita/i })).toBeInTheDocument();
  });

  it('shows valid transition buttons for IN_PROGRESS status', () => {
    render(
      <AppointmentStatusTransitionDrawer
        open={true}
        onClose={onClose}
        onSuccess={onSuccess}
        appointmentId="appt-1"
        currentStatus="IN_PROGRESS"
      />,
    );
    expect(screen.getByRole('button', { name: /completar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar cita/i })).toBeInTheDocument();
  });

  it('shows terminal message for COMPLETED status', () => {
    render(
      <AppointmentStatusTransitionDrawer
        open={true}
        onClose={onClose}
        onSuccess={onSuccess}
        appointmentId="appt-1"
        currentStatus="COMPLETED"
      />,
    );
    expect(screen.getByText(/estado.*terminal/i)).toBeInTheDocument();
  });

  it('calls updateAppointmentStatusAction on transition button click', async () => {
    vi.mocked(updateAppointmentStatusAction).mockResolvedValue(null);
    render(
      <AppointmentStatusTransitionDrawer
        open={true}
        onClose={onClose}
        onSuccess={onSuccess}
        appointmentId="appt-1"
        currentStatus="SCHEDULED"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    await waitFor(() => {
      expect(updateAppointmentStatusAction).toHaveBeenCalledWith(
        'appt-1',
        expect.any(FormData),
      );
    });
  });

  it('calls onSuccess after successful transition', async () => {
    vi.mocked(updateAppointmentStatusAction).mockResolvedValue(null);
    render(
      <AppointmentStatusTransitionDrawer
        open={true}
        onClose={onClose}
        onSuccess={onSuccess}
        appointmentId="appt-1"
        currentStatus="SCHEDULED"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });

  it('shows error when action returns error', async () => {
    vi.mocked(updateAppointmentStatusAction).mockResolvedValue({
      error: 'Transición inválida',
    });
    render(
      <AppointmentStatusTransitionDrawer
        open={true}
        onClose={onClose}
        onSuccess={onSuccess}
        appointmentId="appt-1"
        currentStatus="SCHEDULED"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    await waitFor(() => {
      expect(screen.getByText('Transición inválida')).toBeInTheDocument();
    });
  });
});
