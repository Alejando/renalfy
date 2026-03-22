'use client';

import { useState, useTransition } from 'react';
import type { LocationResponse } from '@repo/types';
import { LocationDrawer } from './location-drawer';
import { updateLocationStatusAction } from '../../../../../actions/locations';
import { EmptyState } from '../../../../../components/empty-state';

interface LocationsPageClientProps {
  locations: LocationResponse[];
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
};

const STATUS_CLASSES: Record<string, string> = {
  ACTIVE: 'bg-primary/10 text-primary',
  INACTIVE: 'bg-surface-container-high text-secondary',
};

export function LocationsPageClient({ locations }: LocationsPageClientProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  const openCreate = () => {
    setSelectedLocation(null);
    setDrawerOpen(true);
  };

  const openEdit = (location: LocationResponse) => {
    setSelectedLocation(location);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedLocation(null);
  };

  const toggleStatus = (location: LocationResponse) => {
    const newStatus = location.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    startTransition(async () => {
      await updateLocationStatusAction(location.id, newStatus);
    });
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">Sucursales</h1>
          <p className="text-secondary text-sm mt-1">
            Gestiona las ubicaciones de tu clínica
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-5 py-2.5 rounded-md text-on-primary font-semibold text-sm transition-all active:scale-[0.98] hover:opacity-95 shadow-md shadow-primary/10"
          style={{ background: 'linear-gradient(135deg, #00647c 0%, #008fa3 100%)' }}
        >
          + Nueva sucursal
        </button>
      </div>

      {/* Table or empty state */}
      {locations.length === 0 ? (
        <EmptyState
          title="Sin sucursales aún"
          description="Crea tu primera ubicación para empezar a gestionar tu clínica."
          action={
            <button
              type="button"
              onClick={openCreate}
              className="px-5 py-2.5 rounded-md text-on-primary font-semibold text-sm shadow-md shadow-primary/10"
              style={{ background: 'linear-gradient(135deg, #00647c 0%, #008fa3 100%)' }}
            >
              + Nueva sucursal
            </button>
          }
        />
      ) : (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="text-left px-6 py-4 text-[10px] font-label uppercase tracking-widest text-secondary font-semibold">
                  Nombre
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-label uppercase tracking-widest text-secondary font-semibold">
                  Dirección
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-label uppercase tracking-widest text-secondary font-semibold">
                  Teléfono
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-label uppercase tracking-widest text-secondary font-semibold">
                  Estado
                </th>
                <th className="text-right px-6 py-4 text-[10px] font-label uppercase tracking-widest text-secondary font-semibold">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {locations.map((location) => (
                <tr
                  key={location.id}
                  className="hover:bg-surface-container-low/50 transition-colors"
                >
                  <td className="px-6 py-4 text-on-surface font-medium">{location.name}</td>
                  <td className="px-6 py-4 text-secondary text-sm">
                    {location.address ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-secondary text-sm">
                    {location.phone ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold font-label ${STATUS_CLASSES[location.status] ?? ''}`}
                    >
                      {STATUS_LABELS[location.status] ?? location.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => openEdit(location)}
                        className="text-sm text-primary font-semibold hover:underline decoration-2 underline-offset-2"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStatus(location)}
                        disabled={isPending}
                        className="text-sm text-secondary font-semibold hover:text-on-surface transition-colors disabled:opacity-50"
                      >
                        {location.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LocationDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        onSuccess={closeDrawer}
        location={selectedLocation ?? undefined}
      />
    </div>
  );
}
