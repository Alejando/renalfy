'use client';

import { useState } from 'react';
import Link from 'next/link';

const IS_LOCAL = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const BASE_DOMAIN = IS_LOCAL ? 'localhost:4000' : 'renalfy.app';
const PROTOCOL = IS_LOCAL ? 'http' : 'https';

export default function RenaflyLoginPage() {
  const [subdomain, setSubdomain] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const slug = subdomain.trim().toLowerCase();
    if (slug) {
      window.location.href = `${PROTOCOL}://${slug}.${BASE_DOMAIN}/login`;
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold text-sky-600">
            Renalfy
          </Link>
          <p className="mt-2 text-sm text-gray-500">
            Ingresa el subdominio de tu clínica para continuar
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border px-8 py-8 flex flex-col gap-5"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="subdomain" className="text-sm font-medium text-gray-700">
              Subdominio de tu clínica
            </label>
            <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-transparent">
              <input
                id="subdomain"
                type="text"
                required
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                className="flex-1 px-3 py-2 text-sm focus:outline-none"
                placeholder="mi-clinica"
                autoCapitalize="none"
                autoCorrect="off"
              />
              <span className="px-3 py-2 text-sm text-gray-400 bg-gray-50 border-l border-gray-300 whitespace-nowrap">
                .{BASE_DOMAIN}
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-sky-600 text-white py-2.5 text-sm font-medium hover:bg-sky-700 transition-colors"
          >
            Continuar
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          ¿No tienes cuenta?{' '}
          <Link href="/registro" className="text-sky-600 hover:underline">
            Crea tu clínica
          </Link>
        </p>
      </div>
    </main>
  );
}
