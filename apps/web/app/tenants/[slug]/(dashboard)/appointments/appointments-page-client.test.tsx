import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { PaginatedAppointmentsResponse, AppointmentResponse } from '@repo/types';

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

vi.mock('./appointment-create-drawer', () => ({
  AppointmentCreateDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="appointment-create-drawer" /> : null,
}));

import { useRouter } from 'next/navigation';
import { AppointmentsPageClient } from './appointments-page-client';

const mockRouterPush = vi.fn();

function makeAppointment(
  overrides: Partial<AppointmentResponse> = {},
): AppointmentResponse {
  return {
    id: 'appt-1',
    tenantId: 'tenant-1',
    locationId: 'loc-1',
    patientId: 'patient-1',
    userId: 'user-1',
    serviceTypeId: 'svc-1',
    receiptId: null,
    scheduledAt: new Date('2026-03-22T10:00:00Z'),
    startedAt: null,
    endedAt: null,
    status: 'SCHEDULED',
    clinicalData: null,
    notes: null,
    measurements: [],
    createdAt: new Date('2026-03-22'),
    updatedAt: new Date('2026-03-22'),
    ...overrides,
  };
}

function makeAppointments(
  data: AppointmentResponse[] = [makeAppointment()],
): PaginatedAppointmentsResponse {
  return {
    data,
    total: data.length,
    page: 1,
    limit: 20,
  };
}

describe('AppointmentsPageClient', () => {
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

  it('renders page heading', () => {
    render(
      <AppointmentsPageClient
        appointments={makeAppointments()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
        serviceTypes={[]}
        patients={[]}
      />,
    );
    expect(screen.getByRole('heading', { name: /citas/i })).toBeInTheDocument();
  });

  it('shows appointment in the table', () => {
    render(
      <AppointmentsPageClient
        appointments={makeAppointments()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
        serviceTypes={[]}
        patients={[]}
      />,
    );
    // The badge appears in the table row (also appears as a filter option)
    const badges = screen.getAllByText('Programada');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('shows EmptyState when appointments list is empty', () => {
    render(
      <AppointmentsPageClient
        appointments={makeAppointments([])}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
        serviceTypes={[]}
        patients={[]}
      />,
    );
    expect(screen.getByText(/sin citas/i)).toBeInTheDocument();
  });

  it('shows status filter', () => {
    render(
      <AppointmentsPageClient
        appointments={makeAppointments()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
        serviceTypes={[]}
        patients={[]}
      />,
    );
    expect(screen.getByLabelText(/estado/i)).toBeInTheDocument();
  });

  it('navigates with status filter when filter changes', () => {
    render(
      <AppointmentsPageClient
        appointments={makeAppointments()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
        serviceTypes={[]}
        patients={[]}
      />,
    );
    const statusFilter = screen.getByLabelText(/estado/i);
    fireEvent.change(statusFilter, { target: { value: 'SCHEDULED' } });
    expect(mockRouterPush).toHaveBeenCalledWith(
      expect.stringContaining('status=SCHEDULED'),
    );
  });

  it('does not show pagination when total <= limit', () => {
    render(
      <AppointmentsPageClient
        appointments={makeAppointments([makeAppointment()])}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
        serviceTypes={[]}
        patients={[]}
      />,
    );
    expect(screen.queryByRole('button', { name: /anterior/i })).not.toBeInTheDocument();
  });

  it('shows pagination when total > limit', () => {
    render(
      <AppointmentsPageClient
        appointments={{ data: [makeAppointment()], total: 25, page: 1, limit: 20 }}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
        serviceTypes={[]}
        patients={[]}
      />,
    );
    expect(screen.getByRole('button', { name: /anterior/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeInTheDocument();
  });

  it('opens create drawer when "Nueva cita" button is clicked', async () => {
    render(
      <AppointmentsPageClient
        appointments={makeAppointments()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
        serviceTypes={[]}
        patients={[]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /nueva cita/i }));
    await waitFor(() => {
      expect(screen.getByTestId('appointment-create-drawer')).toBeInTheDocument();
    });
  });

  it('renders link to appointment detail for each row', () => {
    render(
      <AppointmentsPageClient
        appointments={makeAppointments()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
        serviceTypes={[]}
        patients={[]}
      />,
    );
    const link = screen.getByRole('link', { name: /ver detalle/i });
    expect(link).toHaveAttribute('href', '/appointments/appt-1');
  });
});
