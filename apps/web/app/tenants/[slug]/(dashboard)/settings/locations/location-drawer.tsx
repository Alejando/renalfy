'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import type { LocationResponse } from '@repo/types';
import {
  createLocationAction,
  updateLocationAction,
  type LocationActionState,
} from '../../../../../actions/locations';

interface LocationDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  location?: LocationResponse;
}

export function LocationDrawer({ open, onClose, onSuccess, location }: LocationDrawerProps) {
  const isEdit = location !== undefined;
  const action = isEdit ? updateLocationAction : createLocationAction;

  const [state, dispatch, isPending] = useActionState<LocationActionState, FormData>(
    action,
    null,
  );

  const [nameError, setNameError] = useState('');
  const prevPendingRef = useRef(false);

  // Detect successful submission: isPending went true → false with state === null
  useEffect(() => {
    if (prevPendingRef.current && !isPending && state === null) {
      onSuccess();
    }
    prevPendingRef.current = isPending;
  }, [isPending, state, onSuccess]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string) ?? '';
    if (!name.trim()) {
      setNameError('El nombre es obligatorio');
      return;
    }
    setNameError('');
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
        aria-label={isEdit ? 'Editar sucursal' : 'Nueva sucursal'}
        role="dialog"
        aria-modal="true"
        className="fixed right-0 top-0 h-full w-full max-w-md bg-surface-container-lowest shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="px-8 py-6 bg-surface-container-low flex items-center justify-between">
          <div>
            <h2 className="font-headline font-bold text-xl text-on-surface">
              {isEdit ? 'Editar sucursal' : 'Nueva sucursal'}
            </h2>
            <p className="text-secondary text-sm mt-0.5">
              {isEdit
                ? 'Modifica los datos de la sucursal'
                : 'Agrega una nueva ubicación a tu clínica'}
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

        {/* Error banner from server action */}
        {state?.error && (
          <div className="mx-8 mt-6 p-3 bg-error-container rounded-lg">
            <p className="text-on-error-container text-sm font-medium">{state.error}</p>
          </div>
        )}

        {/* Form */}
        <form
          aria-label={isEdit ? 'Editar sucursal' : 'Nueva sucursal'}
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-8 py-6 space-y-6"
        >
          {isEdit && <input type="hidden" name="id" value={location.id} />}

          {/* Nombre */}
          <div className="space-y-2">
            <label
              htmlFor="loc-name"
              className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
            >
              Nombre <span className="text-error">*</span>
            </label>
            <input
              id="loc-name"
              name="name"
              type="text"
              defaultValue={location?.name ?? ''}
              placeholder="Ej. Sucursal Centro"
              className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {nameError && <p className="text-error text-xs font-medium">{nameError}</p>}
          </div>

          {/* Dirección */}
          <div className="space-y-2">
            <label
              htmlFor="loc-address"
              className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
            >
              Dirección
            </label>
            <input
              id="loc-address"
              name="address"
              type="text"
              defaultValue={location?.address ?? ''}
              placeholder="Ej. Av. Principal 123, Col. Centro"
              className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <label
              htmlFor="loc-phone"
              className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
            >
              Teléfono
            </label>
            <input
              id="loc-phone"
              name="phone"
              type="tel"
              defaultValue={location?.phone ?? ''}
              placeholder="Ej. 555-123-4567"
              className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

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
              {isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear sucursal'}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
