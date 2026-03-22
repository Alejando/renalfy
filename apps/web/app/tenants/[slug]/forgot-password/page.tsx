import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <main className="flex h-screen w-full overflow-hidden">
      {/* Left panel — Branding */}
      <section className="hidden md:flex flex-col justify-between w-[40%] bg-primary p-12 text-on-primary relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="z-10 flex items-center gap-3">
          <span className="text-2xl font-extrabold tracking-tight font-headline">Renalfy</span>
        </div>

        <div className="z-10 mb-12">
          <div className="mb-8 flex items-center justify-center h-64">
            <div className="text-[9rem] opacity-80 select-none">📧</div>
          </div>
          <h2 className="font-headline font-bold text-4xl leading-tight mb-4 max-w-sm">
            Recupera el acceso a tu cuenta
          </h2>
          <p className="text-primary-fixed opacity-90 max-w-xs font-light leading-relaxed">
            Te enviaremos un enlace seguro para restablecer tu contraseña.
          </p>
        </div>

        <div className="z-10">
          <p className="text-[10px] font-label uppercase tracking-widest opacity-60">
            Renalfy Clinical Curator © 2025
          </p>
        </div>
      </section>

      {/* Right panel — Form */}
      <section className="w-full md:w-[60%] flex flex-col justify-center items-center bg-surface-container-low px-6 md:px-20 relative">
        <div className="w-full max-w-md bg-surface-container-lowest p-10 rounded-xl shadow-sm">
          <header className="mb-10">
            <h3 className="font-headline font-bold text-[1.75rem] text-primary mb-2">
              ¿Olvidaste tu contraseña?
            </h3>
            <p className="text-secondary text-sm">
              Ingresa tu correo electrónico y te enviaremos instrucciones para restablecerla.
            </p>
          </header>

          <div className="space-y-2 mb-8">
            <label
              className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
              htmlFor="email"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="medico@clinica.com"
              required
              className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <button
            type="button"
            disabled
            className="w-full text-on-primary font-bold py-4 rounded-md opacity-60 cursor-not-allowed mb-6"
            style={{ background: 'linear-gradient(135deg, #00647c 0%, #008fa3 100%)' }}
          >
            Enviar instrucciones
          </button>

          <p className="text-center text-xs text-secondary mb-4">
            Esta función estará disponible próximamente.
          </p>

          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-primary text-sm font-semibold hover:underline decoration-2 underline-offset-4 transition-all"
            >
              ← Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
