import { cookies } from 'next/headers';
import { PublicTenantResponseSchema, type PublicTenantResponse } from '@repo/types';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4001/api';

/**
 * Authenticated API fetch — reads access_token cookie and attaches Bearer header.
 * Only call from Server Components or Server Actions.
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
