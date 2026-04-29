import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PublicTenantResponseSchema, type PublicTenantResponse } from '@repo/types';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3019/api';

/**
 * Authenticated API fetch — reads access_token cookie and attaches Bearer header.
 * Only call from Server Components or Server Actions.
 * On 401, automatically attempts token refresh and retries.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  // If 401, try to refresh token and retry
  if (res.status === 401 && accessToken) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      // Retry original request with new token
      const newCookieStore = await cookies();
      const newAccessToken = newCookieStore.get('access_token')?.value;
      const retryRes = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(newAccessToken ? { Authorization: `Bearer ${newAccessToken}` } : {}),
          ...(init?.headers ?? {}),
        },
      });

      if (retryRes.ok) {
        return retryRes.json() as Promise<T>;
      }

      // If retry still fails, redirect to login
      redirect('/login');
    } else {
      // Token refresh failed, redirect to login
      redirect('/login');
    }
  }

  if (!res.ok) {
    let message = `API error: ${res.status.toString()}`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data.message) {
        message = Array.isArray(data.message) ? data.message[0] : data.message;
      }
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

async function attemptTokenRefresh(): Promise<boolean> {
  const API_URL_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3019/api';

  try {
    const res = await fetch(`${API_URL_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // include cookies (refresh_token)
    });

    if (!res.ok) {
      return false;
    }

    // Import here to avoid circular dependency
    const { AuthTokensSchema } = await import('@repo/types');
    const data: unknown = await res.json();
    const tokens = AuthTokensSchema.parse(data);

    const IS_PRODUCTION = process.env.NODE_ENV === 'production';
    const ACCESS_TOKEN_TTL = 60 * 15; // 15 minutes
    const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 7; // 7 days

    const cookieStore = await cookies();
    cookieStore.set('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'lax',
      maxAge: ACCESS_TOKEN_TTL,
      path: '/',
    });
    cookieStore.set('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_TTL,
      path: '/',
    });

    return true;
  } catch {
    return false;
  }
}

export async function getPublicTenant(slug: string): Promise<PublicTenantResponse | null> {
  const res = await fetch(`${API_URL}/public/tenants/${slug}`, {
    next: { revalidate: 60 },
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch tenant: ${res.status.toString()}`);
  }

  const data: unknown = await res.json();
  return PublicTenantResponseSchema.parse(data);
}
