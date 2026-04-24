import { NextResponse, type NextRequest } from 'next/server';

const ROOT_DOMAIN = 'renalfy.app';
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3019/api';
const ACCESS_TOKEN_TTL = 60 * 15; // 15 minutes
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Paths accessible without authentication on tenant subdomains
const PUBLIC_PATHS = new Set(['/', '/login', '/forgot-password']);

/**
 * Extrae el slug del tenant desde el hostname.
 *
 * Soporta:
 *   clinica-demo.localhost:3020  → "clinica-demo"  (desarrollo local)
 *   clinica-demo.renalfy.app     → "clinica-demo"  (producción)
 *   localhost:3020               → null             (dominio raíz, marketing)
 *   renalfy.app                  → null             (dominio raíz, marketing)
 */
export function extractSlug(host: string): string | null {
  const hostname = host.split(':')[0] ?? '';

  if (hostname.endsWith('.localhost')) {
    const slug = hostname.slice(0, -('.localhost'.length));
    return slug.length > 0 ? slug : null;
  }

  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = hostname.slice(0, -(`.${ROOT_DOMAIN}`.length));
    return slug.length > 0 ? slug : null;
  }

  return null;
}

async function tryRefreshToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const accessToken = data['accessToken'];
    if (typeof accessToken !== 'string') return null;
    return accessToken;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const host = request.headers.get('host') ?? '';
  const slug = extractSlug(host);
  const pathname = request.nextUrl.pathname;

  // Auth guard: protect all tenant routes except public paths
  if (slug !== null && !PUBLIC_PATHS.has(pathname)) {
    const accessToken = request.cookies.get('access_token');

    if (!accessToken) {
      const refreshToken = request.cookies.get('refresh_token');

      if (!refreshToken) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl) as NextResponse;
      }

      const newAccessToken = await tryRefreshToken(refreshToken.value);

      if (!newAccessToken) {
        // Refresh failed — clear stale cookie and send to login
        const loginUrl = new URL('/login', request.url);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete('refresh_token');
        return response as NextResponse;
      }

      // Refresh succeeded — redirect to same URL so the page receives the new cookie
      const response = NextResponse.redirect(request.url);
      response.cookies.set('access_token', newAccessToken, {
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: 'lax',
        maxAge: ACCESS_TOKEN_TTL,
        path: '/',
      });
      return response as NextResponse;
    }
  }

  if (slug) {
    // Rewrite interno: el usuario ve clinica-demo.localhost:3020/login
    // pero Next.js renderiza /tenants/clinica-demo/login
    const url = request.nextUrl.clone();
    url.pathname = `/tenants/${slug}${url.pathname}`;
    return NextResponse.rewrite(url) as NextResponse;
  }

  return NextResponse.next() as NextResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
