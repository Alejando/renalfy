'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import type { LocationResponse, UserResponse } from '@repo/types';
import {
  createUserAction,
  updateUserAction,
  type UserActionState,
} from '../../../../../actions/users';

const ROLES_REQUIRING_LOCATION = ['MANAGER', 'STAFF'] as const;

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  MANAGER: 'Gerente de sucursal',
  STAFF: 'Personal',
};

interface UserDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locations: LocationResponse[];
  user?: UserResponse;
}

export function UserDrawer({ open, onClose, onSuccess, locations, user }: UserDrawerProps) {
  const isEdit = user !== undefined;
  const action = isEdit ? updateUserAction : createUserAction;

  const [state, dispatch, isPending] = useActionState<UserActionState, FormData>(
    action,
    null,
  );

  const defaultRole = user?.role ?? 'STAFF';
  const [selectedRole, setSelectedRole] = useState(defaultRole);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const prevPendingRef = useRef(false);

  useEffect(() => {
    if (prevPendingRef.current && !isPending && state === null) {
      onSuccess();
    }
    prevPendingRef.current = isPending;
  }, [isPending, state, onSuccess]);

  // Reset role when user prop changes (edit mode toggle)
  useEffect(() => {
    setSelectedRole(user?.role ?? 'STAFF');
    setErrors({});
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const requiresLocation = (ROLES_REQUIRING_LOCATION as readonly string[]).includes(
    selectedRole,
  ) as boolean;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newErrors: Record<string, string> = {};

    const name = (formData.get('name') as string) ?? '';
    if (!name.trim()) {
      newErrors['name'] = 'El nombre es obligatorio';
    }

    if (!isEdit) {
      const email = (formData.get('email') as string) ?? '';
      if (!email.trim()) newErrors['email'] = 'El email es obligatorio';

      const password = (formData.get('password') as string) ?? '';
      if (!password.trim()) newErrors['password'] = 'La contraseña es obligatoria';
    }

    const locationId = (formData.get('locationId') as string) ?? '';
    if (requiresLocation && !locationId) {
      newErrors['locationId'] = 'La sucursal es obligatoria para este rol';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    dispatch(formData);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-inverse-surface/20 backdrop-blur-[2px] z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        aria-label={isEdit ? 'Editar usuario' : 'Nuevo usuario'}
        role="dialog"
        aria-modal="true"
        className="fixed right-0 top-0 h-full w-full max-w-md bg-surface-container-lowest shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="px-8 py-6 bg-surface-container-low flex items-center justify-between">
          <div>
            <h2 className="font-headline font-bold text-xl text-on-surface">
              {isEdit ? 'Editar usuario' : 'Nuevo usuario'}
            </h2>
            <p className="text-secondary text-sm mt-0.5">
              {isEdit
                ? 'Modifica los datos del usuario'
                : 'Agrega un nuevo miembro al equipo'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-secondary hover:text-on-surface"
          >
            ✕
          </button>
        </div>

        {/* Server action error banner */}
        {state?.error && (
          <div className="mx-8 mt-6 p-3 bg-error-container rounded-lg">
            <p className="text-on-error-container text-sm font-medium">{state.error}</p>
          </div>
        )}

        {/* Form */}
        <form
          aria-label={isEdit ? 'Editar usuario' : 'Nuevo usuario'}
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-8 py-6 space-y-5"
        >
          {isEdit && <input type="hidden" name="id" value={user.id} />}

          {/* Nombre */}
          <div className="space-y-2">
            <label
              htmlFor="user-name"
              className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
            >
              Nombre completo <span className="text-error">*</span>
            </label>
            <input
              id="user-name"
              name="name"
              type="text"
              defaultValue={user?.name ?? ''}
              placeholder="Ej. María González"
              className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {errors['name'] && (
              <p className="text-error text-xs font-medium">{errors['name']}</p>
            )}
          </div>

          {/* Email — create only */}
          {!isEdit && (
            <div className="space-y-2">
              <label
                htmlFor="user-email"
                className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
              >
                Email <span className="text-error">*</span>
              </label>
              <input
                id="user-email"
                name="email"
                type="email"
                placeholder="usuario@clinica.com"
                className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {errors['email'] && (
                <p className="text-error text-xs font-medium">{errors['email']}</p>
              )}
            </div>
          )}

          {/* Contraseña — create only */}
          {!isEdit && (
            <div className="space-y-2">
              <label
                htmlFor="user-password"
                className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
              >
                Contraseña <span className="text-error">*</span>
              </label>
              <input
                id="user-password"
                name="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {errors['password'] && (
                <p className="text-error text-xs font-medium">{errors['password']}</p>
              )}
            </div>
          )}

          {/* Teléfono */}
          <div className="space-y-2">
            <label
              htmlFor="user-phone"
              className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
            >
              Teléfono
            </label>
            <input
              id="user-phone"
              name="phone"
              type="tel"
              defaultValue={user?.phone ?? ''}
              placeholder="Ej. 555-123-4567"
              className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Rol */}
          <div className="space-y-2">
            <label
              htmlFor="user-role"
              className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
            >
              Rol <span className="text-error">*</span>
            </label>
            <select
              id="user-role"
              name="role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as typeof defaultRole)}
              className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Sucursal — conditional on role */}
          {requiresLocation && (
            <div className="space-y-2">
              <label
                htmlFor="user-location"
                className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
              >
                Sucursal <span className="text-error">*</span>
              </label>
              <select
                id="user-location"
                name="locationId"
                defaultValue={user?.locationId ?? ''}
                className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="">Selecciona una sucursal</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
              {errors['locationId'] && (
                <p className="text-error text-xs font-medium">{errors['locationId']}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-md bg-surface-container text-secondary font-semibold text-sm hover:bg-surface-container-high transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-3 rounded-md text-on-primary font-bold text-sm transition-all active:scale-[0.98] hover:opacity-95 shadow-md shadow-primary/10 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #00647c 0%, #008fa3 100%)' }}
            >
              {isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
