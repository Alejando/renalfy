import type { ReactNode } from 'react';
import { getPublicTenant } from '../../../lib/api';

interface Props {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getPublicTenant(slug);

  if (!tenant) {
    return { title: 'Renalfy' };
  }

  return {
    title: tenant.settings?.tagline
      ? `${tenant.name} — ${tenant.settings.tagline}`
      : tenant.name,
    description: tenant.settings?.description ?? undefined,
  };
}

export default async function TenantLayout({ children, params }: Props) {
  const { slug } = await params;
  const tenant = await getPublicTenant(slug);

  const primaryColor = tenant?.settings?.primaryColor ?? '#0ea5e9';
  const secondaryColor = tenant?.settings?.secondaryColor ?? '#64748b';

  return (
    <div
      style={
        {
          '--color-primary': primaryColor,
          '--color-secondary': secondaryColor,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
