import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { PatientResponse } from '@repo/types';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('../../../../../actions/patients', () => ({
  deletePatientAction: vi.fn(),
}));

vi.mock('../patient-drawer', () => ({
  PatientDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="patient-drawer" /> : null,
}));

import { useRouter } from 'next/navigation';
import { deletePatientAction } from '../../../../../actions/patients';
import { PatientDetailClient } from './patient-detail-client';

const mockRouterPush = vi.fn();

const mockPatient: PatientResponse = {
  id: 'patient-1',
  tenantId: 'tenant-1',
  locationId: 'loc-1',
  locationName: 'Sucursal Centro',
  name: 'Juan Pérez',
  birthDate: new Date('1980-05-15'),
  phone: '555-0001',
  mobile: '555-0002',
  address: 'Calle Falsa 123',
  notes: 'Paciente con diálisis peritoneal',
  status: 'ACTIVE',
  hasConsent: true,
  consent: {
    type: 'PRIVACY_NOTICE',
    version: '1.0',
    signedAt: new Date('2026-01-01'),
  },
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('PatientDetailClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: mockRouterPush,
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    });
  });

  it('shows all patient fields', () => {
    render(
      <PatientDetailClient patient={mockPatient} userRole="OWNER" userLocationId={null} />,
    );
    expect(screen.getAllByText('Juan Pérez').length).toBeGreaterThan(0);
    expect(screen.getByText('555-0001')).toBeInTheDocument();
    expect(screen.getByText('Calle Falsa 123')).toBeInTheDocument();
    expect(screen.getByText('Paciente con diálisis peritoneal')).toBeInTheDocument();
    expect(screen.getAllByText('Sucursal Centro').length).toBeGreaterThan(0);
  });

  it('shows consent data when consent is present', () => {
    render(
      <PatientDetailClient patient={mockPatient} userRole="OWNER" userLocationId={null} />,
    );
    expect(screen.getByText(/aviso de privacidad/i)).toBeInTheDocument();
    expect(screen.getByText(/1\.0/)).toBeInTheDocument();
  });

  it('shows "Sin consentimiento activo" when consent is null', () => {
    const patientNoConsent: PatientResponse = { ...mockPatient, consent: null, hasConsent: false };
    render(
      <PatientDetailClient
        patient={patientNoConsent}
        userRole="OWNER"
        userLocationId={null}
      />,
    );
    expect(screen.getByText(/sin consentimiento activo/i)).toBeInTheDocument();
  });

  it('Edit button opens the patient drawer', () => {
    render(
      <PatientDetailClient patient={mockPatient} userRole="OWNER" userLocationId={null} />,
    );
    expect(screen.queryByTestId('patient-drawer')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByTestId('patient-drawer')).toBeInTheDocument();
  });

  it('shows "Dar de baja" button for OWNER on ACTIVE patient', () => {
    render(
      <PatientDetailClient patient={mockPatient} userRole="OWNER" userLocationId={null} />,
    );
    expect(screen.getByRole('button', { name: /dar de baja/i })).toBeInTheDocument();
  });

  it('does NOT show "Dar de baja" button for STAFF', () => {
    render(
      <PatientDetailClient patient={mockPatient} userRole="STAFF" userLocationId="loc-1" />,
    );
    expect(screen.queryByRole('button', { name: /dar de baja/i })).not.toBeInTheDocument();
  });

  it('does NOT show "Dar de baja" button for DELETED patients', () => {
    const deletedPatient: PatientResponse = { ...mockPatient, status: 'DELETED' };
    render(
      <PatientDetailClient
        patient={deletedPatient}
        userRole="OWNER"
        userLocationId={null}
      />,
    );
    expect(screen.queryByRole('button', { name: /dar de baja/i })).not.toBeInTheDocument();
  });

  it('clicking "Dar de baja" opens AlertDialog without executing action', async () => {
    render(
      <PatientDetailClient patient={mockPatient} userRole="OWNER" userLocationId={null} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /dar de baja/i }));
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
    expect(vi.mocked(deletePatientAction)).not.toHaveBeenCalled();
  });

  it('Cancel button in AlertDialog closes dialog without executing action', async () => {
    render(
      <PatientDetailClient patient={mockPatient} userRole="OWNER" userLocationId={null} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /dar de baja/i }));
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    expect(vi.mocked(deletePatientAction)).not.toHaveBeenCalled();
  });

  it('confirming baja executes deletePatientAction and navigates to /patients', async () => {
    vi.mocked(deletePatientAction).mockResolvedValue(null);
    render(
      <PatientDetailClient patient={mockPatient} userRole="OWNER" userLocationId={null} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /dar de baja/i }));
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
    const allButtons = screen.getAllByRole('button', { name: /dar de baja/i });
    const confirmButton = allButtons.find(
      (btn) => btn.closest('[role="alertdialog"]') !== null,
    );
    expect(confirmButton).toBeDefined();
    fireEvent.click(confirmButton!);
    await waitFor(() => {
      expect(vi.mocked(deletePatientAction)).toHaveBeenCalledWith('patient-1');
    });
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/patients');
    });
  });
});
