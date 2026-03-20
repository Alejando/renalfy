import { describe, it, expect, vi, beforeEach } from 'vitest';
import { proxy } from './proxy';

function makeRequest(host: string, pathname = '/'): Parameters<typeof proxy>[0] {
  return {
    headers: { get: (key: string) => (key === 'host' ? host : null) },
    nextUrl: {
      clone: () => ({ pathname, toString: () => `http://${host}${pathname}` }),
    },
  } as unknown as Parameters<typeof proxy>[0];
}

const mockRewrite = vi.fn();
const mockNext = vi.fn();

vi.mock('next/server', () => ({
  NextResponse: {
    rewrite: (url: unknown) => mockRewrite(url),
    next: () => mockNext(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('proxy', () => {
  it('rewrites *.localhost to /tenants/[slug]/[path]', () => {
    proxy(makeRequest('clinica-demo.localhost:4000', '/login'));

    expect(mockRewrite).toHaveBeenCalledOnce();
    const rewrittenUrl = mockRewrite.mock.calls[0][0] as { pathname: string };
    expect(rewrittenUrl.pathname).toBe('/tenants/clinica-demo/login');
  });

  it('rewrites *.renalfy.app to /tenants/[slug]/[path]', () => {
    proxy(makeRequest('clinica-demo.renalfy.app', '/'));

    expect(mockRewrite).toHaveBeenCalledOnce();
    const rewrittenUrl = mockRewrite.mock.calls[0][0] as { pathname: string };
    expect(rewrittenUrl.pathname).toBe('/tenants/clinica-demo/');
  });

  it('does not rewrite root localhost (marketing domain)', () => {
    proxy(makeRequest('localhost:4000', '/'));

    expect(mockNext).toHaveBeenCalledOnce();
    expect(mockRewrite).not.toHaveBeenCalled();
  });

  it('does not rewrite root renalfy.app (marketing domain)', () => {
    proxy(makeRequest('renalfy.app', '/login'));

    expect(mockNext).toHaveBeenCalledOnce();
    expect(mockRewrite).not.toHaveBeenCalled();
  });

  it('handles multi-part subdomains', () => {
    proxy(makeRequest('mi-clinica.localhost:4000', '/dashboard'));

    const rewrittenUrl = mockRewrite.mock.calls[0][0] as { pathname: string };
    expect(rewrittenUrl.pathname).toBe('/tenants/mi-clinica/dashboard');
  });
});
