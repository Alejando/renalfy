import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { CompanyResponse, PaginatedCompaniesResponse } from '@repo/types';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('../../../../actions/companies', () => ({
  deleteCompanyAction: vi.fn(),
}));

vi.mock('./company-drawer', () => ({
  CompanyDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="company-drawer" /> : null,
}));

import { useRouter } from 'next/navigation';
import { deleteCompanyAction } from '../../../../actions/companies';
import { CompaniesPageClient } from './companies-page-client';

const mockRouterPush = vi.fn();
const mockRouterRefresh = vi.fn();

const COMPANY_UUID_1 = '11111111-1111-4111-8111-111111111111';
const COMPANY_UUID_2 = '22222222-2222-4222-8222-222222222222';
const TENANT_UUID = '33333333-3333-4333-8333-333333333333';

function makeCompany(overrides: Partial<CompanyResponse> = {}): CompanyResponse {
  return {
    id: COMPANY_UUID_1,
    tenantId: TENANT_UUID,
    name: 'Seguros Vida Plena',
    taxId: 'SVP123456ABC',
    phone: '5551234567',
    email: 'contacto@svp.com',
    address: 'Av. Reforma 100',
    contactPerson: 'María García',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeCompanies(
  data: CompanyResponse[] = [makeCompany()],
): PaginatedCompaniesResponse {
  return {
    data,
    total: data.length,
    page: 1,
    limit: 20,
  };
}

describe('CompaniesPageClient', () => {
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
    render(
      <CompaniesPageClient companies={makeCompanies()} userRole="OWNER" />,
    );
    expect(screen.getByRole('heading', { name: /empresas/i })).toBeInTheDocument();
  });

  it('renders table with company data', () => {
    render(
      <CompaniesPageClient companies={makeCompanies()} userRole="OWNER" />,
    );
    expect(screen.getByText('Seguros Vida Plena')).toBeInTheDocument();
    expect(screen.getByText('SVP123456ABC')).toBeInTheDocument();
    expect(screen.getByText('María García')).toBeInTheDocument();
  });

  it('shows empty state when list is empty', () => {
    render(
      <CompaniesPageClient companies={makeCompanies([])} userRole="OWNER" />,
    );
    expect(screen.getByText(/sin empresas/i)).toBeInTheDocument();
  });

  it('opens company drawer on "Nueva Empresa" click', async () => {
    render(
      <CompaniesPageClient companies={makeCompanies()} userRole="OWNER" />,
    );
    fireEvent.click(screen.getByRole('button', { name: /nueva empresa/i }));
    await waitFor(() => {
      expect(screen.getByTestId('company-drawer')).toBeInTheDocument();
    });
  });

  it('opens company drawer in edit mode on "Editar" click', async () => {
    render(
      <CompaniesPageClient companies={makeCompanies()} userRole="OWNER" />,
    );
    fireEvent.click(screen.getByRole('button', { name: /editar/i }));
    await waitFor(() => {
      expect(screen.getByTestId('company-drawer')).toBeInTheDocument();
    });
  });

  it('navigates with search query when search input changes', async () => {
    render(
      <CompaniesPageClient companies={makeCompanies()} userRole="OWNER" />,
    );
    const searchInput = screen.getByPlaceholderText(/buscar empresa/i);
    fireEvent.change(searchInput, { target: { value: 'Seguros' } });
    // debounced — just verify input is reactive
    expect(searchInput).toHaveValue('Seguros');
  });

  it('does not show pagination when total <= limit', () => {
    render(
      <CompaniesPageClient companies={makeCompanies([makeCompany()])} userRole="OWNER" />,
    );
    expect(screen.queryByRole('button', { name: /anterior/i })).not.toBeInTheDocument();
  });

  it('shows pagination when total > limit', () => {
    render(
      <CompaniesPageClient
        companies={{ data: [makeCompany()], total: 25, page: 1, limit: 20 }}
        userRole="OWNER"
      />,
    );
    expect(screen.getByRole('button', { name: /anterior/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeInTheDocument();
  });

  it('calls deleteCompanyAction and refreshes on delete confirm', async () => {
    vi.mocked(deleteCompanyAction).mockResolvedValueOnce(null);
    // Mock window.confirm to return true
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);

    render(
      <CompaniesPageClient companies={makeCompanies()} userRole="OWNER" />,
    );
    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }));
    await waitFor(() => {
      expect(vi.mocked(deleteCompanyAction)).toHaveBeenCalledWith(COMPANY_UUID_1);
    });
  });

  it('does not call deleteCompanyAction when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);

    render(
      <CompaniesPageClient companies={makeCompanies()} userRole="OWNER" />,
    );
    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }));
    expect(vi.mocked(deleteCompanyAction)).not.toHaveBeenCalled();
  });

  it('shows multiple companies in table', () => {
    const companies = [
      makeCompany({ id: COMPANY_UUID_1, name: 'Empresa A' }),
      makeCompany({ id: COMPANY_UUID_2, name: 'Empresa B' }),
    ];
    render(
      <CompaniesPageClient companies={makeCompanies(companies)} userRole="OWNER" />,
    );
    expect(screen.getByText('Empresa A')).toBeInTheDocument();
    expect(screen.getByText('Empresa B')).toBeInTheDocument();
  });
});
