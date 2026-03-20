import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/server before importing middleware
vi.mock('next/server', () => ({
  NextResponse: {
    next: vi.fn(() => ({
      headers: new Map(),
    })),
    redirect: vi.fn(),
  },
}));

const { middleware } = await import('./middleware.js');

function makeRequest(host: string) {
  return {
    headers: { get: (key: string) => (key === 'host' ? host : null) },
    url: `http://${host}/`,
    nextUrl: { pathname: '/' },
  };
}

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('subdomain extraction', () => {
    it('should inject x-tenant-slug from subdomain', async () => {
      const { NextResponse } = await import('next/server');
      const mockResponse = { headers: { set: vi.fn() } };
      vi.mocked(NextResponse.next).mockReturnValue(mockResponse as never);

      await middleware(makeRequest('clinica-centro.renalfy.app') as never);

      expect(mockResponse.headers.set).toHaveBeenCalledWith('x-tenant-slug', 'clinica-centro');
    });

    it('should handle multi-part subdomains correctly', async () => {
      const { NextResponse } = await import('next/server');
      const mockResponse = { headers: { set: vi.fn() } };
      vi.mocked(NextResponse.next).mockReturnValue(mockResponse as never);

      await middleware(makeRequest('clinica-norte-2.renalfy.app') as never);

      expect(mockResponse.headers.set).toHaveBeenCalledWith('x-tenant-slug', 'clinica-norte-2');
    });

    it('should not inject tenant slug for root domain', async () => {
      const { NextResponse } = await import('next/server');
      const mockResponse = { headers: { set: vi.fn() } };
      vi.mocked(NextResponse.next).mockReturnValue(mockResponse as never);

      await middleware(makeRequest('renalfy.app') as never);

      expect(mockResponse.headers.set).not.toHaveBeenCalledWith(
        'x-tenant-slug',
        expect.anything(),
      );
    });

    it('should use DEV_TENANT_SLUG env var on localhost', async () => {
      const { NextResponse } = await import('next/server');
      const mockResponse = { headers: { set: vi.fn() } };
      vi.mocked(NextResponse.next).mockReturnValue(mockResponse as never);
      vi.stubEnv('NEXT_PUBLIC_DEV_TENANT_SLUG', 'dev-clinica');

      await middleware(makeRequest('localhost:4000') as never);

      expect(mockResponse.headers.set).toHaveBeenCalledWith('x-tenant-slug', 'dev-clinica');
      vi.unstubAllEnvs();
    });
  });
});
