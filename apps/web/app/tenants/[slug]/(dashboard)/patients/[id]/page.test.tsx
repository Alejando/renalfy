import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PatientResponse } from '@repo/types';

vi.mock('../../../../../../lib/api', () => ({
  apiFetch: vi.fn(),
  getPublicTenant: vi.fn(),
}));

vi.mock('../../../../../../lib/session', () => ({
  getSessionUser: vi.fn(),
}));

vi.mock('./patient-detail-client', () => ({
  PatientDetailClient: ({ patient }: { patient: PatientResponse }) => (
    <div data-testid="patient-detail">{patient.name}</div>
  ),
}));

vi.mock('../../../../../components/error-state', () => ({
  ErrorState: ({ message }: { message: string }) => (
    <div data-testid="error-state">{message}</div>
  ),
}));

import { apiFetch } from '../../../../../../lib/api';
import { getSessionUser } from '../../../../../../lib/session';
import PatientDetailPage from './page';

const mockPatient: PatientResponse = {
  id: 'patient-1',
  tenantId: 'tenant-1',
  locationId: 'loc-1',
  locationName: 'Sucursal Centro',
  name: 'Juan Pérez',
  birthDate: null,
  phone: null,
  mobile: null,
  address: null,
  notes: null,
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

describe('PatientDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: 'user-1',
      tenantId: 'tenant-1',
      role: 'OWNER',
      locationId: null,
    });
  });

  it('renders PatientDetailClient with patient data when API responds ok', async () => {
    vi.mocked(apiFetch).mockResolvedValue(mockPatient);
    render(await PatientDetailPage({ params: Promise.resolve({ id: 'patient-1', slug: 'demo' }) }));
    expect(screen.getByTestId('patient-detail')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
  });

  it('renders "Paciente no encontrado" when API throws 404-like error', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error('API error: 404'));
    render(await PatientDetailPage({ params: Promise.resolve({ id: 'bad-id', slug: 'demo' }) }));
    expect(screen.getByTestId('error-state')).toBeInTheDocument();
    expect(screen.getByText(/no encontrado/i)).toBeInTheDocument();
  });

  it('renders ErrorState when API fails with non-404 error', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error('API error: 500'));
    render(await PatientDetailPage({ params: Promise.resolve({ id: 'patient-1', slug: 'demo' }) }));
    expect(screen.getByTestId('error-state')).toBeInTheDocument();
  });
});
