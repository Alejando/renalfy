import { NextResponse } from 'next/server';

export async function GET() {
  const content = `# Security policy for Renalfy
# Standard: https://tools.ietf.org/html/draft-foudil-securitytxt

# Contact information for security researchers
Contact: security@renalfy.app

# Security policy and procedures
Policy: https://renalfy.app/security-policy

# Where to report vulnerabilities
Acknowledgments: https://renalfy.app/security-acknowledgments

# When this file expires
Expires: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()}

# Canonical URL
Canonical: https://renalfy.app/.well-known/security.txt

# Preferred vulnerability disclosure language
Preferred-Languages: en, es
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400', // Cache for 1 day
    },
  });
}
