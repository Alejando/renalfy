import { PublicTenantResponseSchema, type PublicTenantResponse } from '@repo/types';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4001/api';

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
