'use client';

import { useState, useTransition } from 'react';
import type { LocationResponse } from '@repo/types';
import { LocationDrawer } from './location-drawer';
import { updateLocationStatusAction } from '../../../../../actions/locations';
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

interface LocationsPageClientProps {
  locations: LocationResponse[];
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
};

const TABLE_HEAD_CLASS =
  'text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

function getStatusVariant(
  status: string,
): 'status-active' | 'status-inactive' {
  return status === 'ACTIVE' ? 'status-active' : 'status-inactive';
}

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
        <Button variant="gradient" onClick={openCreate}>
          + Nueva sucursal
        </Button>
      </div>

      {/* Table or empty state */}
      {locations.length === 0 ? (
        <EmptyState
          title="Sin sucursales aún"
          description="Crea tu primera ubicación para empezar a gestionar tu clínica."
          action={
            <Button variant="gradient" onClick={openCreate}>
              + Nueva sucursal
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl overflow-hidden border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={TABLE_HEAD_CLASS}>Nombre</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Dirección</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Teléfono</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Estado</TableHead>
                <TableHead className={`${TABLE_HEAD_CLASS} text-right`}>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell className="text-foreground font-medium">
                    {location.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {location.address ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {location.phone ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(location.status)}>
                      {STATUS_LABELS[location.status] ?? location.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-3">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => openEdit(location)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStatus(location)}
                        disabled={isPending}
                      >
                        {location.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
