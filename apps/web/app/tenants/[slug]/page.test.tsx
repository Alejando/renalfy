import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TenantLandingPage from './page';

vi.mock('../../../lib/api', () => ({
  getPublicTenant: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
}));

const mockTenant = {
  id: 'b1d2e3f4-0000-0000-0000-000000000001',
  name: 'Clínica Centro',
  slug: 'clinica-centro',
  settings: {
    logoUrl: null,
    coverUrl: null,
    primaryColor: '#1a73e8',
    secondaryColor: null,
    tagline: 'Tu salud, nuestra prioridad',
    description: 'La mejor clínica de diálisis.',
    phone: '3311223344',
    email: null,
    address: 'Av. Principal 123, Guadalajara',
  },
};

describe('TenantLandingPage', () => {
  it('should display the clinic name and tagline', async () => {
    const { getPublicTenant } = await import('../../../lib/api');
    vi.mocked(getPublicTenant).mockResolvedValue(mockTenant);

    const Page = await TenantLandingPage({ params: Promise.resolve({ slug: 'clinica-centro' }) });
    render(Page);

    expect(screen.getByRole('heading', { name: 'Clínica Centro' })).toBeInTheDocument();
    expect(screen.getByText('Tu salud, nuestra prioridad')).toBeInTheDocument();
  });

  it('should display contact information when available', async () => {
    const { getPublicTenant } = await import('../../../lib/api');
    vi.mocked(getPublicTenant).mockResolvedValue(mockTenant);

    const Page = await TenantLandingPage({ params: Promise.resolve({ slug: 'clinica-centro' }) });
    render(Page);

    expect(screen.getByText('3311223344')).toBeInTheDocument();
    expect(screen.getByText('Av. Principal 123, Guadalajara')).toBeInTheDocument();
  });

  it('should call notFound when tenant does not exist', async () => {
    const { getPublicTenant } = await import('../../../lib/api');
    const { notFound } = await import('next/navigation');
    vi.mocked(getPublicTenant).mockResolvedValue(null);

    await expect(
      TenantLandingPage({ params: Promise.resolve({ slug: 'no-existe' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(notFound).toHaveBeenCalled();
  });

  it('should link to the privacy page', async () => {
    const { getPublicTenant } = await import('../../../lib/api');
    vi.mocked(getPublicTenant).mockResolvedValue(mockTenant);

    const Page = await TenantLandingPage({ params: Promise.resolve({ slug: 'clinica-centro' }) });
    render(Page);

    expect(screen.getByRole('link', { name: /privacidad/i })).toBeInTheDocument();
  });

  it('should link to /login for sign in', async () => {
    const { getPublicTenant } = await import('../../../lib/api');
    vi.mocked(getPublicTenant).mockResolvedValue(mockTenant);

    const Page = await TenantLandingPage({ params: Promise.resolve({ slug: 'clinica-centro' }) });
    render(Page);

    const loginLink = screen.getByRole('link', { name: /iniciar sesión/i });
    expect(loginLink).toHaveAttribute('href', '/login');
  });
});
