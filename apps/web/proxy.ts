import { NextResponse, type NextRequest } from 'next/server';

const ROOT_DOMAIN = 'renalfy.app';

/**
 * Extrae el slug del tenant desde el hostname.
 *
 * Soporta:
 *   clinica-demo.localhost:4000  → "clinica-demo"  (desarrollo local)
 *   clinica-demo.renalfy.app     → "clinica-demo"  (producción)
 *   localhost:4000               → null             (dominio raíz, marketing)
 *   renalfy.app                  → null             (dominio raíz, marketing)
 */
function extractSlug(host: string): string | null {
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

export function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const slug = extractSlug(host);

  if (slug) {
    // Rewrite interno: el usuario ve clinica-demo.localhost:4000/login
    // pero Next.js renderiza /tenants/clinica-demo/login
    const url = request.nextUrl.clone();
    url.pathname = `/tenants/${slug}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
