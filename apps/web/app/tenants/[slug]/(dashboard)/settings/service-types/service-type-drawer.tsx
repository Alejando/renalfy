'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import type { ServiceTypeResponse } from '@repo/types';
import {
  createServiceTypeAction,
  updateServiceTypeAction,
  type ServiceTypeActionState,
} from '../../../../../actions/service-types';

interface ServiceTypeDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  serviceType?: ServiceTypeResponse;
}

export function ServiceTypeDrawer({
  open,
  onClose,
  onSuccess,
  serviceType,
}: ServiceTypeDrawerProps) {
  const isEdit = serviceType !== undefined;
  const action = isEdit ? updateServiceTypeAction : createServiceTypeAction;

  const [state, dispatch, isPending] = useActionState<ServiceTypeActionState, FormData>(
    action,
    null,
  );

  const [nameError, setNameError] = useState('');
  const prevPendingRef = useRef(false);

  // Detect successful submission
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
        aria-label={isEdit ? 'Editar tipo de servicio' : 'Nuevo tipo de servicio'}
        role="dialog"
        aria-modal="true"
        className="fixed right-0 top-0 h-full w-full max-w-md bg-surface-container-lowest shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="px-8 py-6 bg-surface-container-low flex items-center justify-between">
          <div>
            <h2 className="font-headline font-bold text-xl text-on-surface">
              {isEdit ? 'Editar tipo de servicio' : 'Nuevo tipo de servicio'}
            </h2>
            <p className="text-secondary text-sm mt-0.5">
              {isEdit
                ? 'Modifica los datos del tipo de servicio'
                : 'Agrega un nuevo tipo de servicio a tu clínica'}
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

        {/* Server error banner */}
        {state?.error && (
          <div className="mx-8 mt-6 p-3 bg-error-container rounded-lg">
            <p className="text-on-error-container text-sm font-medium">{state.error}</p>
          </div>
        )}

        {/* Form */}
        <form
          aria-label={isEdit ? 'Editar tipo de servicio' : 'Nuevo tipo de servicio'}
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-8 py-6 space-y-6"
        >
          {isEdit && <input type="hidden" name="id" value={serviceType.id} />}

          {/* Nombre */}
          <div className="space-y-2">
            <label
              htmlFor="st-name"
              className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
            >
              Nombre <span className="text-error">*</span>
            </label>
            <input
              id="st-name"
              name="name"
              type="text"
              defaultValue={serviceType?.name ?? ''}
              placeholder="Ej. Hemodiálisis"
              className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {nameError && <p className="text-error text-xs font-medium">{nameError}</p>}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <label
              htmlFor="st-description"
              className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
            >
              Descripción
            </label>
            <textarea
              id="st-description"
              name="description"
              rows={3}
              defaultValue={serviceType?.description ?? ''}
              placeholder="Descripción opcional del servicio"
              className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            />
          </div>

          {/* Precio */}
          <div className="space-y-2">
            <label
              htmlFor="st-price"
              className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
            >
              Precio (MXN)
            </label>
            <input
              id="st-price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={serviceType?.price ?? ''}
              placeholder="Ej. 1500.00"
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
              {isPending
                ? 'Guardando…'
                : isEdit
                  ? 'Guardar cambios'
                  : 'Crear tipo de servicio'}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
