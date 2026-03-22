'use client';

import Link from 'next/link';
import { useState } from 'react';

const IS_LOCAL = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const BASE_DOMAIN = IS_LOCAL ? 'localhost:4000' : 'renalfy.app';
const PROTOCOL = IS_LOCAL ? 'http' : 'https';
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4001/api';

export default function RenafyLoginPage() {
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = slug.trim().toLowerCase();
    if (!trimmed) return;

    setError('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/public/tenants/${trimmed}`);
      if (res.status === 404) {
        setError('No encontramos una clínica con ese subdominio. Verifica e intenta de nuevo.');
        return;
      }
      if (!res.ok) {
        setError('Ocurrió un error al verificar el subdominio. Intenta de nuevo.');
        return;
      }
      window.location.href = `${PROTOCOL}://${trimmed}.${BASE_DOMAIN}/login`;
    } catch {
      setError('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface font-body text-on-surface antialiased">
      <main className="flex-1 flex flex-col md:flex-row">

        {/* Left panel */}
        <section className="hidden md:flex flex-col justify-between w-5/12 bg-surface-container-low p-8 md:p-16">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #00647c, #007f9d)' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 3v14M3 10h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-headline text-2xl font-extrabold tracking-tight text-primary">
              Renalfy
            </span>
          </Link>

          <div>
            <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-on-surface leading-tight mb-6">
              The Clinical
              <br />
              <span className="text-primary-container">Curator.</span>
            </h1>
            <p className="text-secondary text-lg leading-relaxed max-w-xs">
              Accede al espacio de trabajo personalizado de tu clínica. Un ecosistema de alto nivel diseñado para la nefrología moderna.
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm text-outline font-medium tracking-wide">
            <span>Seguro</span>
            <span className="text-outline-variant">·</span>
            <span>HIPAA Compliant</span>
            <span className="text-outline-variant">·</span>
            <span>Encriptado</span>
          </div>
        </section>

        {/* Right panel */}
        <section className="flex-1 md:w-7/12 bg-surface flex items-center justify-center p-6 md:p-24 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-tertiary/5 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />

          <div className="w-full max-w-lg z-10 space-y-4">
            <div className="bg-surface-container-lowest p-8 md:p-12 rounded-xl border border-outline-variant/15 shadow-sm">
              <header className="mb-10">
                <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">
                  Bienvenido
                </h2>
                <p className="text-secondary font-medium">
                  Ingresa el subdominio único de tu clínica para continuar.
                </p>
              </header>

              <form onSubmit={handleContinue} className="space-y-6">
                <div>
                  <label
                    htmlFor="clinic-slug"
                    className="block text-xs font-bold tracking-widest text-secondary uppercase mb-3"
                  >
                    Subdominio de tu clínica
                  </label>
                  <div className="flex items-center bg-surface-container-highest rounded-lg focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <input
                      id="clinic-slug"
                      type="text"
                      value={slug}
                      onChange={(e) => { setSlug(e.target.value); setError(''); }}
                      placeholder="nombre-clinica"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-lg py-4 px-5 font-medium text-on-surface placeholder:text-outline/50"
                    />
                    <span className="pr-5 py-4 text-secondary font-medium text-lg border-l border-outline-variant/20 ml-2 pl-4 whitespace-nowrap shrink-0">
                      .renalfy.app
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-outline font-medium">
                    Ejemplo: central-valley-dialisis.renalfy.app
                  </p>
                </div>

                {error && (
                  <p role="alert" className="text-sm text-error font-medium bg-error-container/30 border border-error/20 rounded-lg px-4 py-3">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!slug.trim() || isLoading}
                  className="w-full text-on-primary font-headline font-bold text-lg py-4 rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #00647c, #007f9d)' }}
                >
                  {isLoading ? 'Verificando...' : 'Continuar'}
                  {!isLoading && (
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center text-secondary font-medium">
                ¿No tienes cuenta?{' '}
                <Link href="/registro" className="text-primary font-semibold hover:underline underline-offset-2">
                  Crea tu clínica
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container-low p-4 rounded-xl flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1.5L2 4v4c0 3.31 2.57 6.41 6 7 3.43-.59 6-3.69 6-7V4L8 1.5z" fill="#00647c" opacity=".15"/>
                    <path d="M8 1.5L2 4v4c0 3.31 2.57 6.41 6 7 3.43-.59 6-3.69 6-7V4L8 1.5z" stroke="#00647c" strokeWidth="1.3" strokeLinejoin="round"/>
                    <path d="M5.5 8l2 2 3-3" stroke="#00647c" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface uppercase tracking-tighter mb-0.5">Identidad</p>
                  <p className="text-[11px] text-secondary leading-tight">Autenticación clínica segura</p>
                </div>
              </div>

              <div className="bg-surface-container-low p-4 rounded-xl flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="5.5" stroke="#00647c" strokeWidth="1.3"/>
                    <path d="M8 3.5V8l2.5 1.5" stroke="#00647c" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface uppercase tracking-tighter mb-0.5">Sync</p>
                  <p className="text-[11px] text-secondary leading-tight">Datos en tiempo real</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="h-16 px-8 flex items-center justify-between bg-surface border-t border-outline-variant/20">
        <nav className="flex items-center gap-6">
          <Link href="/privacidad" className="text-[10px] font-bold text-outline uppercase tracking-[0.15em] hover:text-primary transition-colors">
            Política de privacidad
          </Link>
          <Link href="/terminos" className="text-[10px] font-bold text-outline uppercase tracking-[0.15em] hover:text-primary transition-colors">
            Términos de servicio
          </Link>
          <Link href="/contacto" className="text-[10px] font-bold text-outline uppercase tracking-[0.15em] hover:text-primary transition-colors">
            Soporte
          </Link>
        </nav>
        <p className="text-[10px] font-bold text-outline uppercase tracking-[0.15em]">
          © 2026 Renalfy Cloud Systems
        </p>
      </footer>
    </div>
  );
}
