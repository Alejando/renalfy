import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicTenant } from '../../../lib/api';

interface Props {
  params: Promise<{ tenant: string }>;
}

export default async function TenantLandingPage({ params }: Props) {
  const { tenant: slug } = await params;
  const tenant = await getPublicTenant(slug);

  if (!tenant) {
    notFound();
  }

  const { name, settings } = tenant;

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b">
        {settings?.logoUrl ? (
          <Image src={settings.logoUrl} alt={`${name} logo`} width={160} height={40} className="h-10 w-auto object-contain" />
        ) : (
          <span className="text-xl font-semibold text-[var(--color-primary)]">{name}</span>
        )}
        <Link
          href={`/${slug}/login`}
          className="px-4 py-2 rounded-md text-sm font-medium text-white bg-[var(--color-primary)] hover:opacity-90 transition-opacity"
        >
          Iniciar sesión
        </Link>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 gap-6">
        <h1 className="text-4xl font-bold tracking-tight">{name}</h1>
        {settings?.tagline && (
          <p className="text-xl text-gray-600 max-w-lg">{settings.tagline}</p>
        )}
        {settings?.description && (
          <p className="text-gray-500 max-w-2xl">{settings.description}</p>
        )}
      </section>

      {(settings?.phone ?? settings?.address) && (
        <section className="px-6 py-10 bg-gray-50 border-t">
          <div className="max-w-2xl mx-auto flex flex-col gap-2 text-sm text-gray-600">
            {settings.phone && <span>{settings.phone}</span>}
            {settings.address && <span>{settings.address}</span>}
          </div>
        </section>
      )}

      <footer className="px-6 py-4 border-t text-xs text-gray-400 flex justify-center">
        <Link href={`/${slug}/privacidad`} className="hover:underline">
          Aviso de privacidad
        </Link>
      </footer>
    </main>
  );
}
