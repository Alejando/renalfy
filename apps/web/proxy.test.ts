import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { proxy } from './proxy';

// --- Helpers ---

function makeRequest(options: {
  host: string;
  pathname?: string;
  url?: string;
  accessToken?: string;
  refreshToken?: string;
}): NextRequest {
  const { host, pathname = '/dashboard', accessToken, refreshToken } = options;
  const url = options.url ?? `http://${host}${pathname}`;

  const cookieMap = new Map<string, string>();
  if (accessToken) cookieMap.set('access_token', accessToken);
  if (refreshToken) cookieMap.set('refresh_token', refreshToken);

  return {
    headers: { get: (key: string) => (key === 'host' ? host : null) },
    nextUrl: {
      pathname,
      clone: () => ({ pathname, toString: () => url }),
    },
    url,
    cookies: {
      get: (name: string) => {
        const value = cookieMap.get(name);
        return value !== undefined ? { name, value } : undefined;
      },
    },
  } as unknown as NextRequest;
}

function createMockResponse() {
  return { cookies: { set: vi.fn(), delete: vi.fn() } };
}

const mockRewrite = vi.fn();
const mockNext = vi.fn();
const mockRedirect = vi.fn<(url: unknown) => ReturnType<typeof createMockResponse>>();

vi.mock('next/server', () => ({
  NextResponse: {
    rewrite: (url: unknown) => mockRewrite(url),
    next: () => mockNext(),
    redirect: (url: unknown) => mockRedirect(url),
  },
}));

const mockFetch = vi.fn<typeof fetch>();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  mockRedirect.mockImplementation(() => createMockResponse());
  mockRewrite.mockImplementation(() => createMockResponse());
  mockNext.mockImplementation(() => createMockResponse());
});

describe('proxy — routing', () => {
  it('rewrites *.localhost public path /login without auth', async () => {
    await proxy(makeRequest({ host: 'clinica-demo.localhost:3020', pathname: '/login' }));

    expect(mockRewrite).toHaveBeenCalledOnce();
    const rewrittenUrl = mockRewrite.mock.calls[0]?.[0] as { pathname: string };
    expect(rewrittenUrl.pathname).toBe('/tenants/clinica-demo/login');
  });

  it('rewrites *.renalfy.app for authenticated user', async () => {
    await proxy(
      makeRequest({ host: 'clinica-demo.renalfy.app', pathname: '/', accessToken: 'valid-token' }),
    );

    expect(mockRewrite).toHaveBeenCalledOnce();
    const rewrittenUrl = mockRewrite.mock.calls[0]?.[0] as { pathname: string };
    expect(rewrittenUrl.pathname).toBe('/tenants/clinica-demo/');
  });

  it('does not rewrite root localhost (marketing domain)', async () => {
    await proxy(makeRequest({ host: 'localhost:3020', pathname: '/' }));

    expect(mockNext).toHaveBeenCalledOnce();
    expect(mockRewrite).not.toHaveBeenCalled();
  });

  it('does not rewrite root renalfy.app (marketing domain)', async () => {
    await proxy(makeRequest({ host: 'renalfy.app', pathname: '/login' }));

    expect(mockNext).toHaveBeenCalledOnce();
    expect(mockRewrite).not.toHaveBeenCalled();
  });

  it('handles multi-part subdomains for authenticated user', async () => {
    await proxy(
      makeRequest({ host: 'mi-clinica.localhost:3020', pathname: '/dashboard', accessToken: 'tok' }),
    );

    const rewrittenUrl = mockRewrite.mock.calls[0]?.[0] as { pathname: string };
    expect(rewrittenUrl.pathname).toBe('/tenants/mi-clinica/dashboard');
  });
});

describe('proxy — auth guard', () => {
  it('proxies through on public path /login without tokens', async () => {
    await proxy(makeRequest({ host: 'clinica-demo.localhost:3020', pathname: '/login' }));

    expect(mockRewrite).toHaveBeenCalledOnce();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('proxies through when access_token is present', async () => {
    await proxy(
      makeRequest({ host: 'clinica-demo.localhost:3020', accessToken: 'valid-token' }),
    );

    expect(mockRewrite).toHaveBeenCalledOnce();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('redirects to /login when no tokens are present on protected path', async () => {
    await proxy(makeRequest({ host: 'clinica-demo.localhost:3020' }));

    expect(mockRedirect).toHaveBeenCalledOnce();
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/login' }) as URL,
    );
    expect(mockRewrite).not.toHaveBeenCalled();
  });

  it('sets a new access_token cookie and redirects to same URL when refresh succeeds', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: 'new-access-token' }),
    } as Response);

    const response = await proxy(
      makeRequest({
        host: 'clinica-demo.localhost:3020',
        url: 'http://clinica-demo.localhost:3020/dashboard',
        refreshToken: 'valid-refresh',
      }),
    );

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockRedirect).toHaveBeenCalledOnce();
    expect(mockRedirect).toHaveBeenCalledWith('http://clinica-demo.localhost:3020/dashboard');
    const resp = response as unknown as ReturnType<typeof createMockResponse>;
    expect(resp.cookies.set).toHaveBeenCalledWith(
      'access_token',
      'new-access-token',
      expect.objectContaining({ httpOnly: true, maxAge: 60 * 15 }),
    );
  });

  it('deletes the refresh_token cookie and redirects to /login when refresh fails', async () => {
    mockFetch.mockResolvedValue({ ok: false } as Response);

    const response = await proxy(
      makeRequest({ host: 'clinica-demo.localhost:3020', refreshToken: 'expired-refresh' }),
    );

    expect(mockRedirect).toHaveBeenCalledOnce();
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/login' }) as URL,
    );
    const resp = response as unknown as ReturnType<typeof createMockResponse>;
    expect(resp.cookies.delete).toHaveBeenCalledWith('refresh_token');
  });

  it('deletes the refresh_token cookie and redirects to /login when the network throws', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const response = await proxy(
      makeRequest({ host: 'clinica-demo.localhost:3020', refreshToken: 'valid-refresh' }),
    );

    expect(mockRedirect).toHaveBeenCalledOnce();
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/login' }) as URL,
    );
    const resp = response as unknown as ReturnType<typeof createMockResponse>;
    expect(resp.cookies.delete).toHaveBeenCalledWith('refresh_token');
  });
});
