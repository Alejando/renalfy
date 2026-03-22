'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthTokensSchema, ChangePasswordSchema, LoginSchema } from '@repo/types';
import { getPublicTenant } from '../../lib/api';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4001/api';
const ACCESS_TOKEN_TTL = 60 * 15; // 15 minutes
const REFRESH_TOKEN_TTL_DEFAULT = 60 * 60 * 24 * 7; // 7 days
const REFRESH_TOKEN_TTL_EXTENDED = 60 * 60 * 24 * 30; // 30 days (remember me)
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export type AuthActionState = { error: string } | null;

export async function loginAction(
  slug: string,
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const rememberMe = formData.get('rememberMe') === 'on';
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const result = LoginSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  const tenant = await getPublicTenant(slug);
  if (!tenant) {
    return { error: 'Clínica no encontrada' };
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenant.id,
      },
      body: JSON.stringify(result.data),
    });
  } catch {
    return { error: 'No se pudo conectar al servidor. Intenta de nuevo.' };
  }

  if (!res.ok) {
    return { error: 'Credenciales incorrectas. Verifica tu email y contraseña.' };
  }

  const data: unknown = await res.json();
  const tokens = AuthTokensSchema.parse(data);

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
    maxAge: rememberMe ? REFRESH_TOKEN_TTL_EXTENDED : REFRESH_TOKEN_TTL_DEFAULT,
    path: '/',
  });

  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;

  if (accessToken) {
    // Best-effort API logout — never block user logout on network error
    fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => {});
  }

  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');

  redirect('/login');
}

export async function changePasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const rawData = {
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
  };

  const result = ChangePasswordSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  if (!accessToken) {
    redirect('/login');
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/me/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(result.data),
    });
  } catch {
    return { error: 'No se pudo conectar al servidor. Intenta de nuevo.' };
  }

  if (res.status === 401) {
    redirect('/login');
  }

  if (!res.ok) {
    return { error: 'La contraseña actual es incorrecta.' };
  }

  return null;
}
