'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { changePasswordAction } from '../../../../actions/auth';

function getStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (password.length === 0) return 0;
  if (password.length < 6) return 1;
  let score = 1;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4) as 1 | 2 | 3 | 4;
}

function PasswordStrength({ password }: { password: string }) {
  const strength = getStrength(password);

  if (strength === 0) return null;

  const labels: Record<1 | 2 | 3 | 4, string> = { 1: 'Débil', 2: 'Regular', 3: 'Buena', 4: 'Fuerte' };
  const barColors: Record<1 | 2 | 3 | 4, string> = {
    1: 'bg-error',
    2: 'bg-tertiary',
    3: 'bg-tertiary',
    4: 'bg-primary',
  };
  const textColors: Record<1 | 2 | 3 | 4, string> = {
    1: 'text-error',
    2: 'text-tertiary',
    3: 'text-tertiary',
    4: 'text-primary',
  };

  return (
    <div className="pt-2">
      <div className="flex gap-1.5 h-1 w-full mb-1.5">
        {([1, 2, 3, 4] as const).map((i) => (
          <div
            key={i}
            className={`h-full flex-1 rounded-full transition-colors ${i <= strength ? barColors[strength] : 'bg-surface-container-highest'}`}
          />
        ))}
      </div>
      <div className="flex justify-between items-center">
        <span className={`text-[11px] font-medium ${textColors[strength]}`}>
          {labels[strength]}
        </span>
        <span className="text-[11px] text-secondary">Mínimo 6 caracteres</span>
      </div>
    </div>
  );
}

function EyeToggle({
  visible,
  onToggle,
  label,
}: {
  visible: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
      aria-label={label}
    >
      {visible ? '🙈' : '👁'}
    </button>
  );
}

export default function ChangePasswordPage() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [state, action, isPending] = useActionState(changePasswordAction, null);

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
            <div className="text-[9rem] opacity-80 select-none">🔐</div>
          </div>
          <h2 className="font-headline font-bold text-4xl leading-tight mb-4 max-w-sm">
            Seguridad y confianza en tu práctica clínica
          </h2>
          <p className="text-primary-fixed opacity-90 max-w-xs font-light leading-relaxed">
            Protegemos la integridad de tus datos y la privacidad de tus pacientes con
            estándares de grado médico.
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
              Cambiar contraseña
            </h3>
            <p className="text-secondary text-sm">
              Actualiza tu contraseña de acceso para mantener tu cuenta segura.
            </p>
          </header>

          {state?.error && (
            <div className="mb-6 p-4 bg-error-container rounded-lg">
              <p className="text-on-error-container text-sm font-semibold">{state.error}</p>
            </div>
          )}

          <form action={action} className="space-y-6">
            {/* Current password */}
            <div className="space-y-2">
              <label
                className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
                htmlFor="currentPassword"
              >
                Contraseña actual
              </label>
              <div className="relative">
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrent ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all pr-12"
                />
                <EyeToggle
                  visible={showCurrent}
                  onToggle={() => setShowCurrent((v) => !v)}
                  label={showCurrent ? 'Ocultar contraseña actual' : 'Mostrar contraseña actual'}
                />
              </div>
            </div>

            {/* New password */}
            <div className="space-y-2">
              <label
                className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
                htmlFor="newPassword"
              >
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showNew ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all pr-12"
                />
                <EyeToggle
                  visible={showNew}
                  onToggle={() => setShowNew((v) => !v)}
                  label={showNew ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}
                />
              </div>
              <PasswordStrength password={newPassword} />
            </div>

            {/* Confirm password */}
            <div className="space-y-2">
              <label
                className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
                htmlFor="confirmPassword"
              >
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all pr-12"
                />
                <EyeToggle
                  visible={showConfirm}
                  onToggle={() => setShowConfirm((v) => !v)}
                  label={showConfirm ? 'Ocultar confirmar contraseña' : 'Mostrar confirmar contraseña'}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 space-y-6">
              <button
                type="submit"
                disabled={isPending}
                className="w-full text-on-primary font-bold py-4 rounded-md transition-all active:scale-[0.98] hover:opacity-95 shadow-lg shadow-primary/10 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #00647c 0%, #008fa3 100%)' }}
              >
                {isPending ? 'Actualizando…' : 'Actualizar contraseña'}
              </button>

              <div className="text-center">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 text-primary text-sm font-semibold hover:underline decoration-2 underline-offset-4 transition-all"
                >
                  ← Volver al dashboard
                </Link>
              </div>
            </div>
          </form>
        </div>

        <footer className="mt-12 text-center">
          <p className="text-xs text-secondary font-medium">
            ¿Necesitas ayuda?{' '}
            <a href="mailto:soporte@renalfy.app" className="text-primary hover:underline">
              Contactar a soporte
            </a>
          </p>
        </footer>
      </section>
    </main>
  );
}
