import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { LocationResponse } from '@repo/types';

vi.mock('../../../../../../lib/api', () => ({
  apiFetch: vi.fn(),
  getPublicTenant: vi.fn(),
}));

vi.mock('./locations-page-client', () => ({
  LocationsPageClient: ({ locations }: { locations: LocationResponse[] }) => (
    <div data-testid="locations-client">
      {locations.map((l) => (
        <div key={l.id} data-testid="location-row">
          {l.name}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../../../../../components/error-state', () => ({
  ErrorState: ({ message }: { message: string }) => (
    <div data-testid="error-state">{message}</div>
  ),
}));

import { apiFetch } from '../../../../../../lib/api';
import LocationsPage from './page';

const mockLocations: LocationResponse[] = [
  {
    id: 'loc-1',
    tenantId: 'tenant-1',
    name: 'Sucursal Centro',
    address: 'Av. Principal 123',
    phone: '555-0001',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 'loc-2',
    tenantId: 'tenant-1',
    name: 'Sucursal Norte',
    address: null,
    phone: null,
    status: 'INACTIVE',
    createdAt: new Date('2026-01-02'),
    updatedAt: new Date('2026-01-02'),
  },
];

describe('LocationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a table with location rows when API returns data', async () => {
    vi.mocked(apiFetch).mockResolvedValue(mockLocations);
    render(await LocationsPage());
    expect(screen.getByTestId('locations-client')).toBeInTheDocument();
    expect(screen.getAllByTestId('location-row')).toHaveLength(2);
    expect(screen.getByText('Sucursal Centro')).toBeInTheDocument();
    expect(screen.getByText('Sucursal Norte')).toBeInTheDocument();
  });

  it('renders empty state when API returns an empty array', async () => {
    vi.mocked(apiFetch).mockResolvedValue([]);
    render(await LocationsPage());
    expect(screen.getByTestId('locations-client')).toBeInTheDocument();
    expect(screen.queryAllByTestId('location-row')).toHaveLength(0);
  });

  it('renders error state when apiFetch throws', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error('API error: 500'));
    render(await LocationsPage());
    expect(screen.getByTestId('error-state')).toBeInTheDocument();
  });
});
