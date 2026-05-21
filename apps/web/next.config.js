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
            value:
              "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
