import { NextResponse, type NextRequest } from 'next/server';

const ROOT_DOMAIN = 'renalfy.app';
const LOCALHOST = 'localhost';

function extractSlug(host: string): string | null {
  const hostname = host.split(':')[0] ?? '';

  if (hostname === LOCALHOST) {
    return process.env['NEXT_PUBLIC_DEV_TENANT_SLUG'] ?? null;
  }

  if (!hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    return null;
  }

  const slug = hostname.slice(0, -(`.${ROOT_DOMAIN}`.length));
  return slug.length > 0 ? slug : null;
}

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const slug = extractSlug(host);
  const response = NextResponse.next();

  if (slug) {
    response.headers.set('x-tenant-slug', slug);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
