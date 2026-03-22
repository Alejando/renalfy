import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ServiceTypeResponse } from '@repo/types';

vi.mock('../../../../../actions/service-types', () => ({
  toggleServiceTypeStatusAction: vi.fn(),
}));

vi.mock('./service-type-drawer', () => ({
  ServiceTypeDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="service-type-drawer" /> : null,
}));

import { toggleServiceTypeStatusAction } from '../../../../../actions/service-types';
import { ServiceTypesPageClient } from './service-types-page-client';

const makeServiceType = (overrides: Partial<ServiceTypeResponse> = {}): ServiceTypeResponse => ({
  id: 'st-1',
  tenantId: 'tenant-1',
  name: 'Hemodiálisis',
  description: 'Sesión estándar de hemodiálisis',
  price: 1500,
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

describe('ServiceTypesPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders table with service type data', () => {
    render(<ServiceTypesPageClient serviceTypes={[makeServiceType()]} />);
    expect(screen.getByText('Hemodiálisis')).toBeInTheDocument();
    expect(screen.getByText('Sesión estándar de hemodiálisis')).toBeInTheDocument();
  });

  it('shows EmptyState when list is empty', () => {
    render(<ServiceTypesPageClient serviceTypes={[]} />);
    expect(screen.getByText(/sin tipos de servicio/i)).toBeInTheDocument();
  });

  it('shows "Activo" badge for ACTIVE service types', () => {
    render(<ServiceTypesPageClient serviceTypes={[makeServiceType({ status: 'ACTIVE' })]} />);
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('shows "Inactivo" badge for INACTIVE service types', () => {
    render(
      <ServiceTypesPageClient serviceTypes={[makeServiceType({ status: 'INACTIVE' })]} />,
    );
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('shows "Desactivar" button for ACTIVE types and "Activar" for INACTIVE types', () => {
    render(
      <ServiceTypesPageClient
        serviceTypes={[
          makeServiceType({ id: 'st-1', status: 'ACTIVE' }),
          makeServiceType({ id: 'st-2', status: 'INACTIVE', name: 'Diálisis peritoneal' }),
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: /desactivar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^activar$/i })).toBeInTheDocument();
  });

  it('formats price as MXN currency', () => {
    render(<ServiceTypesPageClient serviceTypes={[makeServiceType({ price: 1500 })]} />);
    expect(screen.getByText(/1,500/)).toBeInTheDocument();
  });

  it('shows "—" when price is null', () => {
    render(<ServiceTypesPageClient serviceTypes={[makeServiceType({ price: null })]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('calls toggleServiceTypeStatusAction when toggle button is clicked', async () => {
    vi.mocked(toggleServiceTypeStatusAction).mockResolvedValue(null);
    render(<ServiceTypesPageClient serviceTypes={[makeServiceType({ status: 'ACTIVE' })]} />);
    fireEvent.click(screen.getByRole('button', { name: /desactivar/i }));
    await waitFor(() => {
      expect(vi.mocked(toggleServiceTypeStatusAction)).toHaveBeenCalledWith('st-1', 'INACTIVE');
    });
  });
});
