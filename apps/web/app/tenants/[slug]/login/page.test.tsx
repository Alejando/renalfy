import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mocks must be hoisted before any imports of the modules under test
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('./page.client', () => ({
  LoginPageClient: ({ slug }: { slug: string }) => (
    <div data-testid="login-form">login-form-{slug}</div>
  ),
}));

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { TenantLoginPage } from './page';

// Helper to build a minimal cookie store mock
function makeCookieStore(values: Record<string, string> = {}) {
  return {
    get: vi.fn((name: string) =>
      values[name] ? { name, value: values[name] } : undefined,
    ),
    getAll: vi.fn(() => []),
    has: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };
}

describe('TenantLoginPage (Server Component)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /dashboard when access_token cookie is present', async () => {
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore({ access_token: 'some.jwt.token' }) as unknown as Awaited<
        ReturnType<typeof cookies>
      >,
    );

    await TenantLoginPage({ params: Promise.resolve({ slug: 'clinica-demo' }) });

    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/dashboard');
  });

  it('renders the login form when no access_token cookie is present', async () => {
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore() as unknown as Awaited<ReturnType<typeof cookies>>,
    );

    render(
      await TenantLoginPage({ params: Promise.resolve({ slug: 'clinica-demo' }) }),
    );

    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(screen.getByTestId('login-form')).toHaveTextContent('login-form-clinica-demo');
  });

  it('does not call redirect when there is no access_token cookie', async () => {
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore() as unknown as Awaited<ReturnType<typeof cookies>>,
    );

    render(
      await TenantLoginPage({ params: Promise.resolve({ slug: 'clinica-demo' }) }),
    );

    expect(vi.mocked(redirect)).not.toHaveBeenCalled();
  });
});
