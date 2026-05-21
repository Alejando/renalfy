/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        // Producción: {slug}.renalfy.app → /tenants/{slug}/...
        {
          source: '/:path*',
          has: [{ type: 'host', value: '(?<slug>(?!www$|api$)[^.]+)\\.renalfy\\.app' }],
          destination: '/tenants/:slug/:path*',
        },
        // Desarrollo: {slug}.localhost:{port} → /tenants/{slug}/...
        {
          source: '/:path*',
          has: [{ type: 'host', value: '(?<slug>(?!www$|api$)[^.]+)\\.localhost(?::\\d+)?' }],
          destination: '/tenants/:slug/:path*',
        },
      ],
    };
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Next.js App Router necesita 'unsafe-inline' para sus scripts de hidratación
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              // Permite conectar al API en cualquier puerto local (dev) y al dominio propio (prod)
              "connect-src 'self' http://localhost:* https://*.renalfy.app",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
