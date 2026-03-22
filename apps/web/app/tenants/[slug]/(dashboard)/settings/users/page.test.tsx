import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { LocationResponse, UserResponse } from '@repo/types';

vi.mock('../../../../../../lib/api', () => ({
  apiFetch: vi.fn(),
  getPublicTenant: vi.fn(),
}));

vi.mock('./users-page-client', () => ({
  UsersPageClient: ({
    users,
    locations,
  }: {
    users: UserResponse[];
    locations: LocationResponse[];
  }) => (
    <div data-testid="users-client">
      {users.map((u) => (
        <div key={u.id} data-testid="user-row">
          {u.name}
        </div>
      ))}
      <span data-testid="location-count">{locations.length}</span>
    </div>
  ),
}));

vi.mock('../../../../../components/error-state', () => ({
  ErrorState: ({ message }: { message: string }) => (
    <div data-testid="error-state">{message}</div>
  ),
}));

import { apiFetch } from '../../../../../../lib/api';
import UsersPage from './page';

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

const mockUsers: UserResponse[] = [
  {
    id: 'user-1',
    tenantId: 'tenant-1',
    locationId: null,
    name: 'Ana García',
    email: 'ana@clinica.com',
    role: 'ADMIN',
    status: 'ACTIVE',
    phone: null,
    avatarUrl: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 'user-2',
    tenantId: 'tenant-1',
    locationId: 'loc-1',
    name: 'Pedro López',
    email: 'pedro@clinica.com',
    role: 'STAFF',
    status: 'ACTIVE',
    phone: null,
    avatarUrl: null,
    createdAt: new Date('2026-01-02'),
    updatedAt: new Date('2026-01-02'),
  },
];

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a table with user rows when API returns data', async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(mockUsers)
      .mockResolvedValueOnce(mockLocations);
    render(await UsersPage());
    expect(screen.getByTestId('users-client')).toBeInTheDocument();
    expect(screen.getAllByTestId('user-row')).toHaveLength(2);
    expect(screen.getByText('Ana García')).toBeInTheDocument();
    expect(screen.getByText('Pedro López')).toBeInTheDocument();
  });

  it('renders empty state when API returns empty array', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce([]).mockResolvedValueOnce(mockLocations);
    render(await UsersPage());
    expect(screen.getByTestId('users-client')).toBeInTheDocument();
    expect(screen.queryAllByTestId('user-row')).toHaveLength(0);
  });

  it('passes locations to the client component', async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(mockUsers)
      .mockResolvedValueOnce(mockLocations);
    render(await UsersPage());
    expect(screen.getByTestId('location-count').textContent).toBe('1');
  });

  it('renders error state when apiFetch throws', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error('API error: 500'));
    render(await UsersPage());
    expect(screen.getByTestId('error-state')).toBeInTheDocument();
  });
});
