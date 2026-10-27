import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { PaginatedPatientsResponse } from '@repo/types';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    'aria-label': ariaLabel,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    'aria-label'?: string;
  }) => (
    <a href={href} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  ),
}));

vi.mock('./patient-drawer', () => ({
  PatientDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="patient-drawer" /> : null,
}));

import { useRouter } from 'next/navigation';
import { PatientsPageClient } from './patients-page-client';

const mockRouterPush = vi.fn();

const makePatient = (overrides: Partial<PaginatedPatientsResponse['data'][0]> = {}): PaginatedPatientsResponse['data'][0] => ({
  id: 'patient-1',
  tenantId: 'tenant-1',
  locationId: 'loc-1',
  locationName: 'Sucursal Centro',
  name: 'Juan Pérez',
  birthDate: new Date('1980-05-15'),
  phone: '555-0001',
  mobile: null,
  address: null,
  notes: null,
  status: 'ACTIVE',
  hasConsent: true,
  consent: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

const makePatients = (data: PaginatedPatientsResponse['data'] = [makePatient()]): PaginatedPatientsResponse => ({
  data,
  total: data.length,
  page: 1,
  limit: 20,
});

describe('PatientsPageClient', () => {
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

  it('renders table with patient data', () => {
    render(
      <PatientsPageClient
        patients={makePatients()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('Sucursal Centro')).toBeInTheDocument();
  });

  it('shows EmptyState when patients list is empty', () => {
    render(
      <PatientsPageClient
        patients={makePatients([])}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    expect(screen.getByText(/sin pacientes/i)).toBeInTheDocument();
  });

  it('the patient name is a link to /patients/:id', () => {
    render(
      <PatientsPageClient
        patients={makePatients()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    const link = screen.getByRole('link', { name: /juan pérez/i });
    expect(link).toHaveAttribute('href', '/patients/patient-1');
  });

  it('shows ACTIVE badge with correct label', () => {
    render(
      <PatientsPageClient
        patients={makePatients()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    // Badge is rendered inside a <div> (not an <option>)
    const badges = screen.getAllByText('Activo');
    expect(badges.some((el) => el.tagName !== 'OPTION')).toBe(true);
  });

  it('shows DELETED badge for deleted patients', () => {
    render(
      <PatientsPageClient
        patients={makePatients([makePatient({ status: 'DELETED' })])}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    // Badge is rendered inside a <div> (not an <option>)
    const badges = screen.getAllByText('Dado de baja');
    expect(badges.some((el) => el.tagName !== 'OPTION')).toBe(true);
  });

  it('navigates with search param when Enter is pressed', () => {
    render(
      <PatientsPageClient
        patients={makePatients()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    const searchInput = screen.getByPlaceholderText(/buscar/i);
    fireEvent.change(searchInput, { target: { value: 'Juan' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });
    expect(mockRouterPush).toHaveBeenCalledWith(expect.stringContaining('search=Juan'));
  });

  it('shows pagination disabled when total <= limit', () => {
    render(
      <PatientsPageClient
        patients={makePatients([makePatient()])}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    expect(screen.getByRole('button', { name: /anterior/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeDisabled();
  });

  it('shows pagination when total > limit', () => {
    render(
      <PatientsPageClient
        patients={{ data: [makePatient()], total: 25, page: 1, limit: 20 }}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    expect(screen.getByRole('button', { name: /anterior/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeInTheDocument();
  });

  it('renders link to patient detail for each row chevron', () => {
    render(
      <PatientsPageClient
        patients={makePatients()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    const link = screen.getByRole('link', { name: /ver detalle/i });
    expect(link).toHaveAttribute('href', '/patients/patient-1');
  });

  it('does NOT show inline "Dar de baja" button in the table', () => {
    render(
      <PatientsPageClient
        patients={makePatients()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    expect(screen.queryByRole('button', { name: /dar de baja/i })).not.toBeInTheDocument();
  });
});
