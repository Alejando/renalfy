import { cookies } from 'next/headers';
import type { UserRole } from '@repo/types';

export interface SessionUser {
  userId: string;
  tenantId: string;
  role: UserRole;
}

/**
 * Reads and decodes the access_token JWT cookie to extract the session payload.
 * Does NOT verify the signature — the backend is the authority on validity.
 * Returns null when no cookie is present or the token is malformed.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payloadBase64 = parts[1];
    if (!payloadBase64) return null;

    // Base64url → base64 → JSON
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const decoded = Buffer.from(padded, 'base64').toString('utf-8');
    const payload = JSON.parse(decoded) as Record<string, unknown>;

    const userId = payload['sub'];
    const tenantId = payload['tenantId'];
    const role = payload['role'];

    if (
      typeof userId !== 'string' ||
      typeof tenantId !== 'string' ||
      typeof role !== 'string'
    ) {
      return null;
    }

    return { userId, tenantId, role: role as UserRole };
  } catch {
    return null;
  }
}
