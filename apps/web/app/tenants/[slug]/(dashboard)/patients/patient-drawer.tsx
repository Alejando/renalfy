'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import type { LocationResponse, PatientResponse, UserRole } from '@repo/types';
import {
  createPatientAction,
  updatePatientAction,
  type PatientActionState,
} from '../../../../actions/patients';

interface PatientDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patient?: PatientResponse;
  locations?: LocationResponse[];
  userRole: UserRole;
  userLocationId: string | null;
}

const CONSENT_TYPE_LABELS: Record<string, string> = {
  PRIVACY_NOTICE: 'Aviso de privacidad',
  TREATMENT: 'Tratamiento de datos',
  DATA_SHARING: 'Compartición de datos',
};

const REQUIRES_LOCATION_SELECTOR: UserRole[] = ['OWNER', 'ADMIN'];

export function PatientDrawer({
  open,
  onClose,
  onSuccess,
  patient,
  locations = [],
  userRole,
  userLocationId,
}: PatientDrawerProps) {
  const isEdit = patient !== undefined;
  const action = isEdit ? updatePatientAction : createPatientAction;

  const [state, dispatch, isPending] = useActionState<PatientActionState, FormData>(
    action,
    null,
  );

  const [nameError, setNameError] = useState('');
  const [consentError, setConsentError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [consentType, setConsentType] = useState('');
  const prevPendingRef = useRef(false);

  const showLocationSelector = REQUIRES_LOCATION_SELECTOR.includes(userRole);

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

    let hasError = false;

    if (!isEdit) {
      const name = (formData.get('name') as string) ?? '';
      if (!name.trim()) {
        setNameError('El nombre es obligatorio');
        hasError = true;
      } else {
        setNameError('');
      }

      const consent = (formData.get('consent.type') as string) ?? '';
      if (!consent) {
        setConsentError('El consentimiento es obligatorio');
        hasError = true;
      } else {
        setConsentError('');
      }

      if (showLocationSelector) {
        const locationId = (formData.get('locationId') as string) ?? '';
        if (!locationId) {
          setLocationError('La sucursal es obligatoria');
          hasError = true;
        } else {
          setLocationError('');
        }
      }
    }

    if (hasError) return;

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
        aria-label={isEdit ? 'Editar paciente' : 'Nuevo paciente'}
        role="dialog"
        aria-modal="true"
        className="fixed right-0 top-0 h-full w-full max-w-md bg-surface-container-lowest shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="px-8 py-6 bg-surface-container-low flex items-center justify-between">
          <div>
            <h2 className="font-headline font-bold text-xl text-on-surface">
              {isEdit ? 'Editar paciente' : 'Nuevo paciente'}
            </h2>
            <p className="text-secondary text-sm mt-0.5">
              {isEdit
                ? 'Actualiza los datos de contacto del paciente'
                : 'Registra un nuevo paciente en el sistema'}
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
          aria-label={isEdit ? 'Editar paciente' : 'Nuevo paciente'}
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-8 py-6 space-y-6"
        >
          {isEdit && <input type="hidden" name="id" value={patient.id} />}

          {isEdit ? (
            /* Edit mode: name is read-only text */
            <div className="space-y-1">
              <p className="text-[10px] font-label uppercase tracking-widest text-secondary font-semibold">
                Nombre
              </p>
              <p className="text-on-surface font-medium">{patient.name}</p>
            </div>
          ) : (
            /* Create mode: name input */
            <div className="space-y-2">
              <label
                htmlFor="patient-name"
                className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
              >
                Nombre <span className="text-error">*</span>
              </label>
              <input
                id="patient-name"
                name="name"
                type="text"
                placeholder="Nombre completo del paciente"
                className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {nameError && <p className="text-error text-xs font-medium">{nameError}</p>}
            </div>
          )}

          {/* Location selector — create mode only, OWNER/ADMIN */}
          {!isEdit && showLocationSelector && (
            <div className="space-y-2">
              <label
                htmlFor="patient-location"
                className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
              >
                Sucursal <span className="text-error">*</span>
              </label>
              <select
                id="patient-location"
                name="locationId"
                defaultValue=""
                className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="" disabled>
                  Selecciona una sucursal
                </option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
              {locationError && (
                <p className="text-error text-xs font-medium">{locationError}</p>
              )}
            </div>
          )}

          {/* Location hidden for MANAGER/STAFF */}
          {!isEdit && !showLocationSelector && userLocationId && (
            <input type="hidden" name="locationId" value={userLocationId} />
          )}

          {/* Birth date — create only */}
          {!isEdit && (
            <div className="space-y-2">
              <label
                htmlFor="patient-birthdate"
                className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
              >
                Fecha de nacimiento
              </label>
              <input
                id="patient-birthdate"
                name="birthDate"
                type="date"
                className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          )}

          {/* Phone */}
          <div className="space-y-2">
            <label
              htmlFor="patient-phone"
              className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
            >
              Teléfono
            </label>
            <input
              id="patient-phone"
              name="phone"
              type="tel"
              defaultValue={patient?.phone ?? ''}
              placeholder="Ej. 555-123-4567"
              className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Mobile */}
          <div className="space-y-2">
            <label
              htmlFor="patient-mobile"
              className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
            >
              Celular
            </label>
            <input
              id="patient-mobile"
              name="mobile"
              type="tel"
              defaultValue={patient?.mobile ?? ''}
              placeholder="Ej. 555-987-6543"
              className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label
              htmlFor="patient-address"
              className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
            >
              Dirección
            </label>
            <input
              id="patient-address"
              name="address"
              type="text"
              defaultValue={patient?.address ?? ''}
              placeholder="Ej. Av. Principal 123, Col. Centro"
              className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label
              htmlFor="patient-notes"
              className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
            >
              Notas
            </label>
            <textarea
              id="patient-notes"
              name="notes"
              rows={3}
              defaultValue={patient?.notes ?? ''}
              placeholder="Observaciones adicionales..."
              className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            />
          </div>

          {/* Consent section — create mode only */}
          {!isEdit && (
            <div className="space-y-4 pt-2 border-t border-outline-variant">
              <p className="text-[10px] font-label uppercase tracking-widest text-secondary font-semibold pt-2">
                Consentimiento
              </p>

              <div className="space-y-2">
                <label
                  htmlFor="patient-consent-type"
                  className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
                >
                  Tipo de consentimiento <span className="text-error">*</span>
                </label>
                <select
                  id="patient-consent-type"
                  name="consent.type"
                  value={consentType}
                  onChange={(e) => setConsentType(e.target.value)}
                  className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="" disabled>
                    Selecciona tipo
                  </option>
                  {Object.entries(CONSENT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {consentError && (
                  <p className="text-error text-xs font-medium">{consentError}</p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="patient-consent-version"
                  className="block text-[10px] font-label uppercase tracking-widest text-secondary font-semibold"
                >
                  Versión
                </label>
                <input
                  id="patient-consent-version"
                  name="consent.version"
                  type="text"
                  defaultValue="1.0"
                  placeholder="Ej. 1.0"
                  className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
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
              {isPending
                ? 'Guardando…'
                : isEdit
                  ? 'Guardar cambios'
                  : 'Crear paciente'}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
