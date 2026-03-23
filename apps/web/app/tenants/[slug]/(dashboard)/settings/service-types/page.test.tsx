import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ServiceTypeResponse } from '@repo/types';

vi.mock('../../../../../../lib/api', () => ({
  apiFetch: vi.fn(),
  getPublicTenant: vi.fn(),
}));

vi.mock('./service-types-page-client', () => ({
  ServiceTypesPageClient: ({ serviceTypes }: { serviceTypes: ServiceTypeResponse[] }) => (
    <div data-testid="service-types-client">
      {serviceTypes.map((st) => (
        <div key={st.id} data-testid="service-type-row">
          {st.name}
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
import ServiceTypesPage from './page';

const mockServiceTypes: ServiceTypeResponse[] = [
  {
    id: 'st-1',
    tenantId: 'tenant-1',
    name: 'Hemodiálisis',
    description: 'Sesión estándar',
    price: 1500,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 'st-2',
    tenantId: 'tenant-1',
    name: 'Diálisis peritoneal',
    description: null,
    price: null,
    status: 'INACTIVE',
    createdAt: new Date('2026-01-02'),
    updatedAt: new Date('2026-01-02'),
  },
];

describe('ServiceTypesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ServiceTypesPageClient with data when API returns service types', async () => {
    vi.mocked(apiFetch).mockResolvedValue(mockServiceTypes);
    render(await ServiceTypesPage());
    expect(screen.getByTestId('service-types-client')).toBeInTheDocument();
    expect(screen.getAllByTestId('service-type-row')).toHaveLength(2);
    expect(screen.getByText('Hemodiálisis')).toBeInTheDocument();
  });

  it('renders empty state when API returns empty array', async () => {
    vi.mocked(apiFetch).mockResolvedValue([]);
    render(await ServiceTypesPage());
    expect(screen.getByTestId('service-types-client')).toBeInTheDocument();
    expect(screen.queryAllByTestId('service-type-row')).toHaveLength(0);
  });

  it('renders ErrorState when apiFetch throws', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error('API error: 500'));
    render(await ServiceTypesPage());
    expect(screen.getByTestId('error-state')).toBeInTheDocument();
  });
});
