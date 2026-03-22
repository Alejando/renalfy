'use client';

import { useState, useTransition } from 'react';
import type { ServiceTypeResponse } from '@repo/types';
import { ServiceTypeDrawer } from './service-type-drawer';
import { toggleServiceTypeStatusAction } from '../../../../../actions/service-types';
import { EmptyState } from '../../../../../components/empty-state';

interface ServiceTypesPageClientProps {
  serviceTypes: ServiceTypeResponse[];
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
};

const STATUS_CLASSES: Record<string, string> = {
  ACTIVE: 'bg-primary/10 text-primary',
  INACTIVE: 'bg-surface-container-high text-secondary',
};

function formatPrice(price: number | null): string {
  if (price === null) return '—';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(price);
}

export function ServiceTypesPageClient({ serviceTypes }: ServiceTypesPageClientProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceTypeResponse | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const openCreate = () => {
    setSelectedServiceType(null);
    setDrawerOpen(true);
  };

  const openEdit = (serviceType: ServiceTypeResponse) => {
    setSelectedServiceType(serviceType);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedServiceType(null);
  };

  const toggleStatus = (serviceType: ServiceTypeResponse) => {
    const newStatus = serviceType.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    startTransition(async () => {
      await toggleServiceTypeStatusAction(serviceType.id, newStatus);
    });
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">
            Tipos de servicio
          </h1>
          <p className="text-secondary text-sm mt-1">
            Configura los servicios que ofrece tu clínica
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-5 py-2.5 rounded-md text-on-primary font-semibold text-sm transition-all active:scale-[0.98] hover:opacity-95 shadow-md shadow-primary/10"
          style={{ background: 'linear-gradient(135deg, #00647c 0%, #008fa3 100%)' }}
        >
          + Nuevo tipo de servicio
        </button>
      </div>

      {/* Table or empty state */}
      {serviceTypes.length === 0 ? (
        <EmptyState
          title="Sin tipos de servicio aún"
          description="Crea el primer tipo de servicio para comenzar a gestionar tus sesiones."
          action={
            <button
              type="button"
              onClick={openCreate}
              className="px-5 py-2.5 rounded-md text-on-primary font-semibold text-sm shadow-md shadow-primary/10"
              style={{ background: 'linear-gradient(135deg, #00647c 0%, #008fa3 100%)' }}
            >
              + Nuevo tipo de servicio
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
                <th className="text-left px-6 py-4 text-[10px] font-label uppercase tracking-widest text-secondary font-semibold hidden md:table-cell">
                  Descripción
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-label uppercase tracking-widest text-secondary font-semibold">
                  Precio
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
              {serviceTypes.map((serviceType) => (
                <tr
                  key={serviceType.id}
                  className="hover:bg-surface-container-low/50 transition-colors"
                >
                  <td className="px-6 py-4 text-on-surface font-medium">{serviceType.name}</td>
                  <td className="px-6 py-4 text-secondary text-sm hidden md:table-cell">
                    {serviceType.description ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-secondary text-sm">
                    {formatPrice(serviceType.price)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold font-label ${STATUS_CLASSES[serviceType.status] ?? ''}`}
                    >
                      {STATUS_LABELS[serviceType.status] ?? serviceType.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => openEdit(serviceType)}
                        className="text-sm text-primary font-semibold hover:underline decoration-2 underline-offset-2"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStatus(serviceType)}
                        disabled={isPending}
                        className="text-sm text-secondary font-semibold hover:text-on-surface transition-colors disabled:opacity-50"
                      >
                        {serviceType.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ServiceTypeDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        onSuccess={closeDrawer}
        serviceType={selectedServiceType ?? undefined}
      />
    </div>
  );
}
