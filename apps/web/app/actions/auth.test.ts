import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks deben ir ANTES de importar el módulo bajo test ---

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('../../lib/api', () => ({
  getPublicTenant: vi.fn(),
}));

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getPublicTenant } from '../../lib/api';
import { loginAction, logoutAction, changePasswordAction } from './auth';

// Helpers -----------------------------------------------------------------

function makeCookieStore(values: Record<string, string> = {}) {
  return {
    get: vi.fn((name: string) =>
      values[name] ? { value: values[name] } : undefined,
    ),
    set: vi.fn(),
    delete: vi.fn(),
  };
}

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value);
  }
  return fd;
}

// -------------------------------------------------------------------------
// loginAction
// -------------------------------------------------------------------------

describe('loginAction', () => {
  const SLUG = 'test-clinic';
  const TENANT_ID = 'tenant-uuid-123';
  const ACCESS_TOKEN = 'access.token.jwt';
  const REFRESH_TOKEN = 'refresh.token.jwt';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPublicTenant).mockResolvedValue({
      id: TENANT_ID,
      name: 'Test Clinic',
      slug: SLUG,
      settings: null,
    });
    vi.mocked(cookies).mockResolvedValue(makeCookieStore() as never);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        accessToken: ACCESS_TOKEN,
        refreshToken: REFRESH_TOKEN,
      }),
    });
  });

  it('calls fetch with correct URL and X-Tenant-ID header', async () => {
    const fd = makeFormData({ email: 'doc@clinic.com', password: 'secret123' });
    await loginAction(SLUG, null, fd);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Tenant-ID': TENANT_ID }),
      }),
    );
  });

  it('sends email and password in request body as JSON', async () => {
    const fd = makeFormData({ email: 'doc@clinic.com', password: 'secret123' });
    await loginAction(SLUG, null, fd);

    const [, init] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { email: string; password: string };
    expect(body).toMatchObject({ email: 'doc@clinic.com', password: 'secret123' });
  });

  it('saves access_token cookie as httpOnly after successful login', async () => {
    const store = makeCookieStore();
    vi.mocked(cookies).mockResolvedValue(store as never);

    const fd = makeFormData({ email: 'doc@clinic.com', password: 'secret123' });
    await loginAction(SLUG, null, fd);

    expect(store.set).toHaveBeenCalledWith(
      'access_token',
      ACCESS_TOKEN,
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('saves refresh_token with default TTL (7 days) when rememberMe is absent', async () => {
    const store = makeCookieStore();
    vi.mocked(cookies).mockResolvedValue(store as never);

    const fd = makeFormData({ email: 'doc@clinic.com', password: 'secret123' });
    await loginAction(SLUG, null, fd);

    expect(store.set).toHaveBeenCalledWith(
      'refresh_token',
      REFRESH_TOKEN,
      expect.objectContaining({ maxAge: 60 * 60 * 24 * 7 }),
    );
  });

  it('saves refresh_token with extended TTL (30 days) when rememberMe is "on"', async () => {
    const store = makeCookieStore();
    vi.mocked(cookies).mockResolvedValue(store as never);

    const fd = makeFormData({ email: 'doc@clinic.com', password: 'secret123', rememberMe: 'on' });
    await loginAction(SLUG, null, fd);

    expect(store.set).toHaveBeenCalledWith(
      'refresh_token',
      REFRESH_TOKEN,
      expect.objectContaining({ maxAge: 60 * 60 * 24 * 30 }),
    );
  });

  it('redirects to /dashboard after successful login', async () => {
    const fd = makeFormData({ email: 'doc@clinic.com', password: 'secret123' });
    await loginAction(SLUG, null, fd);

    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });

  it('returns { error } when API responds 401 and does not redirect', async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: false, status: 401 } as unknown as Response);

    const fd = makeFormData({ email: 'doc@clinic.com', password: 'secret123' });
    const result = await loginAction(SLUG, null, fd);

    expect(result).toHaveProperty('error');
    expect(redirect).not.toHaveBeenCalled();
  });

  it('returns { error } when email is invalid without calling fetch', async () => {
    const fd = makeFormData({ email: 'not-an-email', password: 'secret123' });
    const result = await loginAction(SLUG, null, fd);

    expect(result).toHaveProperty('error');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns { error } when password is shorter than 6 chars without calling fetch', async () => {
    const fd = makeFormData({ email: 'doc@clinic.com', password: 'abc' });
    const result = await loginAction(SLUG, null, fd);

    expect(result).toHaveProperty('error');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns { error } when tenant is not found without calling fetch', async () => {
    vi.mocked(getPublicTenant).mockResolvedValue(null);

    const fd = makeFormData({ email: 'doc@clinic.com', password: 'secret123' });
    const result = await loginAction(SLUG, null, fd);

    expect(result).toHaveProperty('error');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns { error } when fetch throws a network error', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('Network failure'));

    const fd = makeFormData({ email: 'doc@clinic.com', password: 'secret123' });
    const result = await loginAction(SLUG, null, fd);

    expect(result).toHaveProperty('error');
    expect(redirect).not.toHaveBeenCalled();
  });
});

// -------------------------------------------------------------------------
// logoutAction
// -------------------------------------------------------------------------

describe('logoutAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  it('deletes access_token cookie', async () => {
    const store = makeCookieStore({ access_token: 'some.token' });
    vi.mocked(cookies).mockResolvedValue(store as never);

    await logoutAction();

    expect(store.delete).toHaveBeenCalledWith('access_token');
  });

  it('deletes refresh_token cookie', async () => {
    const store = makeCookieStore({ access_token: 'some.token', refresh_token: 'some.refresh' });
    vi.mocked(cookies).mockResolvedValue(store as never);

    await logoutAction();

    expect(store.delete).toHaveBeenCalledWith('refresh_token');
  });

  it('redirects to /login after logout', async () => {
    const store = makeCookieStore();
    vi.mocked(cookies).mockResolvedValue(store as never);

    await logoutAction();

    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('completes successfully even without access_token cookie', async () => {
    const store = makeCookieStore();
    vi.mocked(cookies).mockResolvedValue(store as never);

    await logoutAction();

    expect(store.delete).toHaveBeenCalledWith('access_token');
    expect(store.delete).toHaveBeenCalledWith('refresh_token');
    expect(redirect).toHaveBeenCalledWith('/login');
  });
});

// -------------------------------------------------------------------------
// changePasswordAction
// -------------------------------------------------------------------------

describe('changePasswordAction', () => {
  const ACCESS_TOKEN = 'valid.access.token';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore({ access_token: ACCESS_TOKEN }) as never,
    );
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });
  });

  it('calls PATCH /auth/me/password with Authorization Bearer header', async () => {
    const fd = makeFormData({
      currentPassword: 'oldpass123',
      newPassword: 'newpass456',
      confirmPassword: 'newpass456',
    });
    await changePasswordAction(null, fd);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me/password'),
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        }),
      }),
    );
  });

  it('returns null (success) when API responds 204', async () => {
    const fd = makeFormData({
      currentPassword: 'oldpass123',
      newPassword: 'newpass456',
      confirmPassword: 'newpass456',
    });
    const result = await changePasswordAction(null, fd);

    expect(result).toBeNull();
  });

  it('returns { error } when API responds with a non-ok status', async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: false, status: 400 } as unknown as Response);

    const fd = makeFormData({
      currentPassword: 'oldpass123',
      newPassword: 'newpass456',
      confirmPassword: 'newpass456',
    });
    const result = await changePasswordAction(null, fd);

    expect(result).toHaveProperty('error');
    expect(redirect).not.toHaveBeenCalled();
  });

  it('redirects to /login when API responds 401', async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: false, status: 401 } as unknown as Response);

    const fd = makeFormData({
      currentPassword: 'oldpass123',
      newPassword: 'newpass456',
      confirmPassword: 'newpass456',
    });
    await changePasswordAction(null, fd);

    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('returns { error } when newPassword !== confirmPassword without calling fetch', async () => {
    const fd = makeFormData({
      currentPassword: 'oldpass123',
      newPassword: 'newpass456',
      confirmPassword: 'differentpass789',
    });
    const result = await changePasswordAction(null, fd);

    expect(result).toHaveProperty('error');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('error message includes "contraseñas no coinciden" when passwords do not match', async () => {
    const fd = makeFormData({
      currentPassword: 'oldpass123',
      newPassword: 'newpass456',
      confirmPassword: 'differentpass789',
    });
    const result = await changePasswordAction(null, fd);

    expect((result as { error: string }).error).toMatch(/contraseñas no coinciden/i);
  });

  it('returns { error } when currentPassword is empty without calling fetch', async () => {
    const fd = makeFormData({
      currentPassword: '',
      newPassword: 'newpass456',
      confirmPassword: 'newpass456',
    });
    const result = await changePasswordAction(null, fd);

    expect(result).toHaveProperty('error');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('redirects to /login when no access_token cookie is present', async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookieStore() as never);

    const fd = makeFormData({
      currentPassword: 'oldpass123',
      newPassword: 'newpass456',
      confirmPassword: 'newpass456',
    });
    await changePasswordAction(null, fd);

    // redirect() is mocked as vi.fn() — it doesn't throw as in Next.js runtime,
    // so we only assert it was called with the correct path.
    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('returns { error } when fetch throws a network error', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('Network failure'));

    const fd = makeFormData({
      currentPassword: 'oldpass123',
      newPassword: 'newpass456',
      confirmPassword: 'newpass456',
    });
    const result = await changePasswordAction(null, fd);

    expect(result).toHaveProperty('error');
  });
});
