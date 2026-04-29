import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3019/api';
const TOKEN_REFRESH_THRESHOLD = 2 * 60; // Refresh if 2 minutes or less left
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function addSecurityHeaders(response: NextResponse): void {
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // HSTS (only in production)
  if (IS_PRODUCTION) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // CSP (permissive, can be tightened later)
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:"
  );

  // Permissions policy (formerly Feature-Policy)
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
}

export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  // If no tokens, skip
  if (!accessToken || !refreshToken) {
    return NextResponse.next();
  }

  try {
    // Decode token to check expiry (without verification)
    const parts = accessToken.split('.');
    if (parts.length !== 3) {
      return NextResponse.next();
    }

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(parts[1] || '', 'base64').toString('utf-8')
    ) as { exp?: number };

    if (!payload.exp) {
      return NextResponse.next();
    }

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - now;

    // If token expires in less than threshold, refresh it
    if (timeUntilExpiry < TOKEN_REFRESH_THRESHOLD) {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `refresh_token=${refreshToken}`,
        },
      });

      if (response.ok) {
        const data = (await response.json()) as {
          accessToken?: string;
          refreshToken?: string;
        };

        const nextResponse = NextResponse.next();
        const ACCESS_TOKEN_TTL = 60 * 15; // 15 minutes
        const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 7; // 7 days

        if (data.accessToken) {
          nextResponse.cookies.set('access_token', data.accessToken, {
            httpOnly: true,
            secure: IS_PRODUCTION,
            sameSite: 'lax',
            maxAge: ACCESS_TOKEN_TTL,
            path: '/',
          });
        }

        if (data.refreshToken) {
          nextResponse.cookies.set('refresh_token', data.refreshToken, {
            httpOnly: true,
            secure: IS_PRODUCTION,
            sameSite: 'lax',
            maxAge: REFRESH_TOKEN_TTL,
            path: '/',
          });
        }

        addSecurityHeaders(nextResponse);
        return nextResponse;
      }
    }
  } catch {
    // If token decode fails, continue normally
    const nextResponse = NextResponse.next();
    addSecurityHeaders(nextResponse);
    return nextResponse;
  }

  const nextResponse = NextResponse.next();
  addSecurityHeaders(nextResponse);
  return nextResponse;
}

export const config = {
  matcher: [
    // Match authenticated routes only
    '/dashboard/:path*',
    '/inventory/:path*',
    '/patients/:path*',
    '/appointments/:path*',
    '/receipts/:path*',
    '/sales/:path*',
    '/plans/:path*',
    '/companies/:path*',
    '/cash-close/:path*',
    '/reports/:path*',
    '/settings/:path*',
  ],
};
