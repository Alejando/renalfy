import Link from 'next/link';

export default function TenantNotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6 gap-4">
      <h1 className="text-4xl font-bold text-gray-800">Clínica no encontrada</h1>
      <p className="text-gray-500 max-w-md">
        No encontramos ninguna clínica con esa dirección. Verifica que el enlace sea correcto.
      </p>
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        Volver al inicio
      </Link>
    </main>
  );
}
