'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Props {
  params: Promise<{ slug: string }>;
}

export default function TenantLoginPage({ params: _params }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: Sprint 5 — implementar llamada a POST /api/auth/login con X-Tenant-ID
    void e;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-[var(--color-primary)]">Renalfy</span>
          <p className="mt-2 text-sm text-gray-500">Inicia sesión en tu cuenta</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border px-8 py-8 flex flex-col gap-5"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              placeholder="usuario@clinica.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-[var(--color-primary)] text-white py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Iniciar sesión
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          ¿No recuerdas tu clínica?{' '}
          <Link href="https://renalfy.app/login" className="text-[var(--color-primary)] hover:underline">
            Busca tu cuenta
          </Link>
        </p>
      </div>
    </main>
  );
}
