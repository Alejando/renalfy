import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { LocationResponse, PaginatedPatientsResponse, UserRole } from '@repo/types';

vi.mock('../../../../../lib/api', () => ({
  apiFetch: vi.fn(),
  getPublicTenant: vi.fn(),
}));

vi.mock('../../../../../lib/session', () => ({
  getSessionUser: vi.fn(),
}));

vi.mock('./patients-page-client', () => ({
  PatientsPageClient: ({
    patients,
    userRole,
  }: {
    patients: PaginatedPatientsResponse;
    userRole: UserRole;
    userLocationId: string | null;
  }) => (
    <div data-testid="patients-client">
      <span data-testid="role">{userRole}</span>
      {patients.data.map((p) => (
        <div key={p.id} data-testid="patient-row">
          {p.name}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../../../../components/error-state', () => ({
  ErrorState: ({ message }: { message: string }) => (
    <div data-testid="error-state">{message}</div>
  ),
}));

import { apiFetch } from '../../../../../lib/api';
import { getSessionUser } from '../../../../../lib/session';
import PatientsPage from './page';

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

const mockPatientsData: PaginatedPatientsResponse = {
  data: [
    {
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
      consent: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
};

describe('PatientsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: 'user-1',
      tenantId: 'tenant-1',
      role: 'OWNER',
      locationId: null,
    });
  });

  it('renders PatientsPageClient with data when API returns patients', async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(mockPatientsData)
      .mockResolvedValueOnce(mockLocations);
    render(await PatientsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId('patients-client')).toBeInTheDocument();
    expect(screen.getByTestId('patient-row')).toHaveTextContent('Juan Pérez');
  });

  it('passes role from session user to PatientsPageClient', async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(mockPatientsData)
      .mockResolvedValueOnce(mockLocations);
    render(await PatientsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId('role')).toHaveTextContent('OWNER');
  });

  it('renders ErrorState when API throws', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error('API error: 500'));
    render(await PatientsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId('error-state')).toBeInTheDocument();
  });

  it('renders ErrorState when session user is null', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(mockPatientsData)
      .mockResolvedValueOnce(mockLocations);
    render(await PatientsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId('error-state')).toBeInTheDocument();
  });
});
