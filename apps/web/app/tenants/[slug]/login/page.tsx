'use client';

import { useActionState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { loginAction, type AuthActionState } from '../../../actions/auth';

export default function TenantLoginPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const boundAction = useCallback(
    (prev: AuthActionState, formData: FormData) => loginAction(slug, prev, formData),
    [slug],
  );

  const [state, action, isPending] = useActionState(boundAction, null);

  return (
    <main className="bg-surface text-on-surface min-h-screen flex items-center justify-center p-6">
      {/* Container */}
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden ring-1 ring-on-surface/5">

        {/* Left — Branding */}
        <div className="hidden md:flex flex-col justify-between p-12 bg-primary relative overflow-hidden">
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Logo */}
          <div className="relative z-10">
            <Link href={`/tenants/${slug}`} className="flex items-center gap-3 mb-12 hover:opacity-80 transition-opacity w-fit">
              <div className="w-12 h-12 bg-on-primary rounded-lg flex items-center justify-center">
                <span className="text-primary text-2xl font-black">R</span>
              </div>
              <span className="text-2xl font-extrabold tracking-tight text-on-primary font-headline">
                Renalfy
              </span>
            </Link>
            <h1 className="text-5xl font-extrabold text-on-primary leading-tight mb-6 font-headline">
              Gestión <br />
              <span className="text-primary-fixed">Clínica</span> <br />
              Precisa.
            </h1>
            <p className="text-on-primary/80 text-lg max-w-md font-medium leading-relaxed">
              Accede al portal de tu clínica para gestionar pacientes, citas y
              operaciones en tiempo real.
            </p>
          </div>

          {/* Footer quote */}
          <div className="relative z-10 mt-auto">
            <div className="p-6 bg-on-primary/10 backdrop-blur-md rounded-xl border border-white/10">
              <p className="text-on-primary text-sm italic opacity-90 mb-4">
                &ldquo;Simplificar el flujo clínico nos permite enfocarnos más en la salud
                del paciente y menos en el papeleo.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-on-primary/20 flex items-center justify-center text-on-primary font-bold text-sm">
                  Dr
                </div>
                <div>
                  <p className="text-on-primary text-xs font-bold">Equipo Renalfy</p>
                  <p className="text-on-primary/70 text-[10px] uppercase tracking-widest">
                    Plataforma Clínica
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Form */}
        <div className="flex flex-col justify-center items-center p-8 md:p-16 bg-surface-container-lowest">
          <div className="w-full max-w-md">
            {/* Mobile branding */}
            <div className="md:hidden flex items-center gap-2 mb-8">
              <Link href={`/tenants/${slug}`} className="text-xl font-bold tracking-tight text-primary font-headline hover:opacity-80 transition-opacity">
                Renalfy
              </Link>
            </div>

            <div className="mb-10 text-center md:text-left">
              <h2 className="text-3xl font-bold text-on-surface tracking-tight mb-2 font-headline">
                Inicia sesión
              </h2>
              <p className="text-secondary text-sm font-medium">
                Ingresa tus credenciales para acceder al panel clínico.
              </p>
            </div>

            {/* Error alert */}
            {state?.error && (
              <div className="mb-6 p-4 bg-error-container flex items-start gap-3 rounded-lg border border-error/10">
                <span className="text-error text-xl leading-none">⚠</span>
                <div>
                  <p className="text-on-error-container text-sm font-semibold">
                    Error al iniciar sesión
                  </p>
                  <p className="text-on-error-container/80 text-xs">{state.error}</p>
                </div>
              </div>
            )}

            <form action={action} className="space-y-6">
              {/* Email */}
              <div className="space-y-1.5">
                <label
                  className="text-[11px] font-bold uppercase tracking-widest text-secondary block ml-1 font-label"
                  htmlFor="email"
                >
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="medico@clinica.com"
                  className="w-full h-12 px-4 bg-surface-container-highest/50 border-none rounded-lg text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-body"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label
                    className="text-[11px] font-bold uppercase tracking-widest text-secondary font-label"
                    htmlFor="password"
                  >
                    Contraseña
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="w-full h-12 px-4 bg-surface-container-highest/50 border-none rounded-lg text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-body"
                />
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-3 px-1">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  className="w-4 h-4 rounded accent-primary cursor-pointer"
                />
                <label
                  htmlFor="rememberMe"
                  className="text-sm text-secondary cursor-pointer select-none"
                >
                  Recordar mis credenciales por 30 días
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full h-12 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-lg shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? 'Iniciando sesión…' : 'Iniciar sesión'}
              </button>
            </form>

            <div className="mt-12 pt-8 border-t border-surface-container-highest text-center">
              <p className="text-xs text-secondary">
                Solo personal médico autorizado. Sesión monitorizada.
              </p>
              <div className="mt-4 flex justify-center gap-6">
                <Link
                  href="/privacidad"
                  className="text-[10px] text-outline hover:text-primary transition-colors font-semibold uppercase tracking-widest"
                >
                  Privacidad
                </Link>
                <Link
                  href="/"
                  className="text-[10px] text-outline hover:text-primary transition-colors font-semibold uppercase tracking-widest"
                >
                  Inicio
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="fixed top-0 right-0 -z-10 p-24 opacity-20 pointer-events-none">
        <div className="w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full" />
      </div>
      <div className="fixed bottom-0 left-0 -z-10 p-24 opacity-20 pointer-events-none">
        <div className="w-[400px] h-[400px] bg-tertiary/10 blur-[100px] rounded-full" />
      </div>
    </main>
  );
}
