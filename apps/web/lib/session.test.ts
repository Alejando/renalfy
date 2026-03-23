import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { getSessionUser } from './session';

// Helper to create a minimal JWT with the given payload (no signature verification)
function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
    'base64url',
  );
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fakesig`;
}

describe('getSessionUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no access_token cookie is present', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    const result = await getSessionUser();
    expect(result).toBeNull();
  });

  it('returns parsed payload when valid JWT is present', async () => {
    const token = makeJwt({
      sub: 'user-123',
      tenantId: 'tenant-456',
      role: 'ADMIN',
    });
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: token }),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    const result = await getSessionUser();
    expect(result).toEqual({
      userId: 'user-123',
      tenantId: 'tenant-456',
      role: 'ADMIN',
      locationId: null,
    });
  });

  it('returns locationId when present in JWT payload', async () => {
    const token = makeJwt({
      sub: 'user-123',
      tenantId: 'tenant-456',
      role: 'MANAGER',
      locationId: 'loc-789',
    });
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: token }),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    const result = await getSessionUser();
    expect(result).toEqual({
      userId: 'user-123',
      tenantId: 'tenant-456',
      role: 'MANAGER',
      locationId: 'loc-789',
    });
  });

  it('returns null when JWT is malformed (not 3 parts)', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'notavalidjwt' }),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    const result = await getSessionUser();
    expect(result).toBeNull();
  });

  it('returns null when JWT payload is missing required fields', async () => {
    const token = makeJwt({ sub: 'user-123' }); // missing tenantId and role
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: token }),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    const result = await getSessionUser();
    expect(result).toBeNull();
  });
});
