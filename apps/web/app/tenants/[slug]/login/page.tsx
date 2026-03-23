import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LoginPageClient } from './page.client';

interface TenantLoginPageProps {
  params: Promise<{ slug: string }>;
}

export async function TenantLoginPage({ params }: TenantLoginPageProps) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token');

  if (accessToken) {
    redirect('/dashboard');
  }

  const { slug } = await params;

  return <LoginPageClient slug={slug} />;
}

// Next.js App Router requires a default export for page files
export default TenantLoginPage;
