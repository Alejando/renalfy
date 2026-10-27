import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionUser } from '../../../../lib/session';
import { formatThemeStyle } from '../../../../lib/theme';
import { getPublicTenant, apiFetch, isNextInternalError } from '../../../../lib/api';
import { DashboardShell } from './components/shell/dashboard-shell';

interface Props {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function DashboardLayout({ children, params }: Props) {
  const { slug } = await params;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token');

  if (!accessToken) {
    redirect('/login');
  }

  const sessionUser = await getSessionUser();

  const tenant = await getPublicTenant(slug).catch(() => null);

  let me: { name?: string } | null = null;
  try {
    me = await apiFetch<{ name?: string }>('/auth/me');
  } catch (error) {
    if (isNextInternalError(error)) throw error;
  }

  const themeStyle = formatThemeStyle(tenant?.settings?.primaryColor ?? null);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
      <DashboardShell
        userName={me?.name ?? ''}
        userRole={sessionUser?.role ?? ''}
        tenantName={tenant?.name ?? 'Renalfy'}
      >
        {children}
      </DashboardShell>
    </>
  );
}
