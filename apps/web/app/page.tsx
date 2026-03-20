import Link from 'next/link';

export default function RenaflyHome() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-8 py-5 flex items-center justify-between border-b">
        <span className="text-xl font-bold text-sky-600">Renalfy</span>
        <Link
          href="/login"
          className="px-4 py-2 rounded-md text-sm font-medium text-sky-600 border border-sky-200 hover:bg-sky-50 transition-colors"
        >
          Iniciar sesión
        </Link>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-8">
        <div className="flex flex-col gap-4 max-w-2xl">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900">
            Gestión clínica para{' '}
            <span className="text-sky-600">clínicas de diálisis</span>
          </h1>
          <p className="text-lg text-gray-500">
            Administra pacientes, citas, inventario y caja desde una sola plataforma.
            Diseñada para cumplir con NOM-004 y proteger los datos de tus pacientes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/registro"
            className="px-6 py-3 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 transition-colors"
          >
            Crear mi clínica
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      <footer className="px-8 py-5 border-t text-xs text-gray-400 flex justify-between">
        <span>© 2026 Renalfy</span>
        <div className="flex gap-6">
          <Link href="/privacidad" className="hover:underline">Privacidad</Link>
          <Link href="/terminos" className="hover:underline">Términos</Link>
          <Link href="/contacto" className="hover:underline">Contacto</Link>
        </div>
      </footer>
    </main>
  );
}
