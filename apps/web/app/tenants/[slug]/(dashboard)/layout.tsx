import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionUser } from '../../../../lib/session';
import { formatThemeStyle } from '../../../../lib/theme';
import { DashboardShell } from './components/shell/dashboard-shell';

interface Props {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: Props) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token');

  if (!accessToken) {
    redirect('/login');
  }

  const sessionUser = await getSessionUser();

  // TODO: Fetch tenant primaryColor from DB when TenantSettings migration is complete
  const themeStyle = formatThemeStyle(null);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
      <DashboardShell
        userName=""
        userRole={sessionUser?.role ?? ''}
      >
        {children}
      </DashboardShell>
    </>
  );
}
