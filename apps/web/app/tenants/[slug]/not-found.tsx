import Link from 'next/link';

export default function TenantNotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-6xl font-bold text-gray-200">404</h1>
      <p className="mt-4 text-xl font-medium text-gray-700">Clínica no encontrada</p>
      <p className="mt-2 text-gray-500">
        El subdominio que ingresaste no corresponde a ninguna clínica registrada en Renalfy.
      </p>
      <Link
        href="https://renalfy.app"
        className="mt-8 px-6 py-3 rounded-lg text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 transition-colors"
      >
        Volver a Renalfy
      </Link>
    </main>
  );
}
