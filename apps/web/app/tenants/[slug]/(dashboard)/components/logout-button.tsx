'use client';

import { useTransition } from 'react';
import { logoutAction } from '../../../../actions/auth';

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(() => {
      void logoutAction();
    });
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="text-sm font-medium text-secondary hover:text-primary transition-colors disabled:opacity-50"
    >
      {isPending ? 'Cerrando sesión…' : 'Cerrar sesión'}
    </button>
  );
}
