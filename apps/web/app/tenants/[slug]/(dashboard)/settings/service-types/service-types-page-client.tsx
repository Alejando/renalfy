'use client';

import { useState, useTransition } from 'react';
import type { ServiceTypeResponse } from '@repo/types';
import { ServiceTypeDrawer } from './service-type-drawer';
import { toggleServiceTypeStatusAction } from '../../../../../actions/service-types';
import { EmptyState } from '../../../../../components/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ServiceTypesPageClientProps {
  serviceTypes: ServiceTypeResponse[];
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
};

const TABLE_HEAD_CLASS =
  'text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

function formatPrice(price: number | null): string {
  if (price === null) return '—';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(price);
}

function getStatusVariant(status: string): 'status-active' | 'status-inactive' {
  return status === 'ACTIVE' ? 'status-active' : 'status-inactive';
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
        <Button variant="gradient" onClick={openCreate}>
          + Nuevo tipo de servicio
        </Button>
      </div>

      {/* Table or empty state */}
      {serviceTypes.length === 0 ? (
        <EmptyState
          title="Sin tipos de servicio aún"
          description="Crea el primer tipo de servicio para comenzar a gestionar tus sesiones."
          action={
            <Button variant="gradient" onClick={openCreate}>
              + Nuevo tipo de servicio
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl overflow-hidden border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={TABLE_HEAD_CLASS}>Nombre</TableHead>
                <TableHead className={`${TABLE_HEAD_CLASS} hidden md:table-cell`}>
                  Descripción
                </TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Precio</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Estado</TableHead>
                <TableHead className={`${TABLE_HEAD_CLASS} text-right`}>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceTypes.map((serviceType) => (
                <TableRow key={serviceType.id}>
                  <TableCell className="text-foreground font-medium">
                    {serviceType.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                    {serviceType.description ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatPrice(serviceType.price)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(serviceType.status)}>
                      {STATUS_LABELS[serviceType.status] ?? serviceType.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-3">
                      <Button variant="link" size="sm" onClick={() => openEdit(serviceType)}>
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStatus(serviceType)}
                        disabled={isPending}
                      >
                        {serviceType.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
