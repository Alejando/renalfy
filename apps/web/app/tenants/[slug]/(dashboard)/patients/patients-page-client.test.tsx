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

vi.mock('../../../../actions/patients', () => ({
  deletePatientAction: vi.fn(),
}));

vi.mock('./patient-drawer', () => ({
  PatientDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="patient-drawer" /> : null,
}));

import { useRouter } from 'next/navigation';
import { deletePatientAction } from '../../../../actions/patients';
import { PatientsPageClient } from './patients-page-client';

const mockRouterPush = vi.fn();
const mockRouterRefresh = vi.fn();

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
      refresh: mockRouterRefresh,
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
    expect(screen.getByText('Activo')).toBeInTheDocument();
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
    expect(screen.getByText('Dado de baja')).toBeInTheDocument();
  });

  it('navigates with search param when search button is clicked', () => {
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
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));
    expect(mockRouterPush).toHaveBeenCalledWith(expect.stringContaining('search=Juan'));
  });

  it('does not show pagination when total <= limit', () => {
    render(
      <PatientsPageClient
        patients={makePatients([makePatient()])}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    expect(screen.queryByRole('button', { name: /anterior/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /siguiente/i })).not.toBeInTheDocument();
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

  it('shows "Dar de baja" button for OWNER on active patients', () => {
    render(
      <PatientsPageClient
        patients={makePatients()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    expect(screen.getByRole('button', { name: /dar de baja/i })).toBeInTheDocument();
  });

  it('does NOT show "Dar de baja" button for STAFF', () => {
    render(
      <PatientsPageClient
        patients={makePatients()}
        userRole="STAFF"
        userLocationId="loc-1"
        locations={[]}
      />,
    );
    expect(screen.queryByRole('button', { name: /dar de baja/i })).not.toBeInTheDocument();
  });

  it('disables Edit button for DELETED patients', () => {
    render(
      <PatientsPageClient
        patients={makePatients([makePatient({ status: 'DELETED' })])}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    expect(screen.getByRole('button', { name: /editar/i })).toBeDisabled();
  });

  it('clicking "Dar de baja" opens AlertDialog (not executing action immediately)', async () => {
    render(
      <PatientsPageClient
        patients={makePatients()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /dar de baja/i }));
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
    expect(vi.mocked(deletePatientAction)).not.toHaveBeenCalled();
  });

  it('Cancel button in AlertDialog closes dialog without executing action', async () => {
    render(
      <PatientsPageClient
        patients={makePatients()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
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

  it('confirming baja in AlertDialog executes deletePatientAction and refreshes', async () => {
    vi.mocked(deletePatientAction).mockResolvedValue(null);
    render(
      <PatientsPageClient
        patients={makePatients()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /dar de baja/i }));
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
    // There are two "Dar de baja" buttons: the row button and the confirm button in dialog
    const allDarDeBajaButtons = screen.getAllByRole('button', { name: /dar de baja/i });
    // The confirm button is the one inside the alertdialog
    const confirmButton = allDarDeBajaButtons.find(
      (btn) => btn.closest('[role="alertdialog"]') !== null,
    );
    expect(confirmButton).toBeDefined();
    fireEvent.click(confirmButton!);
    await waitFor(() => {
      expect(vi.mocked(deletePatientAction)).toHaveBeenCalledWith('patient-1');
    });
    await waitFor(() => {
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });
});
