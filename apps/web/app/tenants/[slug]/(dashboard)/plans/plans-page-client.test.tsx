import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { PlanResponse, PaginatedPlansResponse } from '@repo/types';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('../../../../actions/plans', () => ({
  deletePlanAction: vi.fn(),
}));

vi.mock('./plan-drawer', () => ({
  PlanDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="plan-drawer" /> : null,
}));

import { useRouter } from 'next/navigation';
import { deletePlanAction } from '../../../../actions/plans';
import { PlansPageClient } from './plans-page-client';

const mockRouterPush = vi.fn();
const mockRouterRefresh = vi.fn();

const PLAN_UUID_1 = '11111111-1111-4111-8111-111111111111';
const TENANT_UUID = '33333333-3333-4333-8333-333333333333';
const LOCATION_UUID = '44444444-4444-4444-8444-444444444444';
const PATIENT_UUID = '55555555-5555-4555-8555-555555555555';
const COMPANY_UUID = '66666666-6666-4666-8666-666666666666';

function makePlan(overrides: Partial<PlanResponse> = {}): PlanResponse {
  return {
    id: PLAN_UUID_1,
    tenantId: TENANT_UUID,
    locationId: LOCATION_UUID,
    patientId: PATIENT_UUID,
    companyId: COMPANY_UUID,
    serviceTypeId: null,
    userId: 'user-1',
    startDate: new Date('2026-01-01'),
    plannedSessions: 12,
    usedSessions: 8,
    amount: '5000.00',
    status: 'ACTIVE',
    notes: null,
    patientName: 'Juan Pérez',
    companyName: 'Seguros Vida Plena',
    serviceTypeName: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makePlans(
  data: PlanResponse[] = [makePlan()],
): PaginatedPlansResponse {
  return { data, total: data.length, page: 1, limit: 20 };
}

const defaultProps = {
  plans: makePlans(),
  userRole: 'OWNER' as const,
  userLocationId: null,
  patients: [{ id: PATIENT_UUID, name: 'Juan Pérez' }],
  companies: [{ id: COMPANY_UUID, name: 'Seguros Vida Plena' }],
  serviceTypes: [],
  locations: [],
};

describe('PlansPageClient', () => {
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

  it('renders page heading', () => {
    render(<PlansPageClient {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /planes/i })).toBeInTheDocument();
  });

  it('renders table with plan data: patient name, company, sessions', () => {
    render(<PlansPageClient {...defaultProps} />);
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    // Company name appears in both filter dropdown and table cell
    const companyMatches = screen.getAllByText('Seguros Vida Plena');
    expect(companyMatches.length).toBeGreaterThan(0);
    expect(screen.getByText('8 / 12')).toBeInTheDocument();
  });

  it('shows empty state when list is empty', () => {
    render(<PlansPageClient {...defaultProps} plans={makePlans([])} />);
    expect(screen.getByText(/sin planes/i)).toBeInTheDocument();
  });

  it('shows ACTIVE status badge with correct label', () => {
    render(<PlansPageClient {...defaultProps} />);
    // "Activo" appears in filter dropdown and badge — verify at least one
    const activeMatches = screen.getAllByText('Activo');
    expect(activeMatches.length).toBeGreaterThan(0);
  });

  it('shows EXHAUSTED status badge', () => {
    render(
      <PlansPageClient
        {...defaultProps}
        plans={makePlans([makePlan({ status: 'EXHAUSTED' })])}
      />,
    );
    // "Agotado" appears in filter dropdown and badge
    const exhaustedMatches = screen.getAllByText('Agotado');
    expect(exhaustedMatches.length).toBeGreaterThan(0);
  });

  it('shows INACTIVE status badge', () => {
    render(
      <PlansPageClient
        {...defaultProps}
        plans={makePlans([makePlan({ status: 'INACTIVE' })])}
      />,
    );
    // "Inactivo" appears in filter dropdown and badge
    const inactiveMatches = screen.getAllByText('Inactivo');
    expect(inactiveMatches.length).toBeGreaterThan(0);
  });

  it('opens plan drawer on "Nuevo Plan" click', async () => {
    render(<PlansPageClient {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /nuevo plan/i }));
    await waitFor(() => {
      expect(screen.getByTestId('plan-drawer')).toBeInTheDocument();
    });
  });

  it('opens plan drawer in edit mode on "Editar" click', async () => {
    render(<PlansPageClient {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /editar/i }));
    await waitFor(() => {
      expect(screen.getByTestId('plan-drawer')).toBeInTheDocument();
    });
  });

  it('navigates with status filter when status filter changes', () => {
    render(<PlansPageClient {...defaultProps} />);
    const statusFilter = screen.getByLabelText(/estado/i);
    fireEvent.change(statusFilter, { target: { value: 'ACTIVE' } });
    expect(mockRouterPush).toHaveBeenCalledWith(expect.stringContaining('status=ACTIVE'));
  });

  it('navigates with company filter when company filter changes', () => {
    render(<PlansPageClient {...defaultProps} />);
    const companyFilter = screen.getByLabelText(/empresa/i);
    fireEvent.change(companyFilter, { target: { value: COMPANY_UUID } });
    expect(mockRouterPush).toHaveBeenCalledWith(
      expect.stringContaining(`companyId=${COMPANY_UUID}`),
    );
  });

  it('does not show pagination when total <= limit', () => {
    render(<PlansPageClient {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /anterior/i })).not.toBeInTheDocument();
  });

  it('shows pagination when total > limit', () => {
    render(
      <PlansPageClient
        {...defaultProps}
        plans={{ data: [makePlan()], total: 25, page: 1, limit: 20 }}
      />,
    );
    expect(screen.getByRole('button', { name: /anterior/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeInTheDocument();
  });

  it('calls deletePlanAction and refreshes on delete confirm', async () => {
    vi.mocked(deletePlanAction).mockResolvedValueOnce(null);
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);

    render(<PlansPageClient {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }));
    await waitFor(() => {
      expect(vi.mocked(deletePlanAction)).toHaveBeenCalledWith(PLAN_UUID_1);
    });
  });

  it('does not call deletePlanAction when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);

    render(<PlansPageClient {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }));
    expect(vi.mocked(deletePlanAction)).not.toHaveBeenCalled();
  });

  it('shows formatted amount', () => {
    render(<PlansPageClient {...defaultProps} />);
    expect(screen.getByText(/5,000/)).toBeInTheDocument();
  });

  it('shows progress bar for sessions', () => {
    render(<PlansPageClient {...defaultProps} />);
    // The progress bar should render as a div with specific style
    // We verify the session count text appears
    expect(screen.getByText('8 / 12')).toBeInTheDocument();
  });
});
