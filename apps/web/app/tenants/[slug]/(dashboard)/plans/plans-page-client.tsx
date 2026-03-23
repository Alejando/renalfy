'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type {
  PlanResponse,
  PaginatedPlansResponse,
  UserRole,
  LocationResponse,
  ServiceTypeResponse,
} from '@repo/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { EmptyState } from '../../../../components/empty-state';
import { PlanStatusBadge } from './plan-status-badge';
import { PlanProgressBar } from './plan-progress-bar';
import { PlanDrawer } from './plan-drawer';
import { deletePlanAction } from '../../../../actions/plans';

interface PatientOption {
  id: string;
  name: string;
}

interface CompanyOption {
  id: string;
  name: string;
}

interface PlansPageClientProps {
  plans: PaginatedPlansResponse;
  userRole: UserRole;
  userLocationId: string | null;
  patients: PatientOption[];
  companies: CompanyOption[];
  serviceTypes: ServiceTypeResponse[];
  locations?: LocationResponse[];
}

const TABLE_HEAD_CLASS =
  'text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

const SELECT_CLASS =
  'bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all appearance-none';

const PLAN_STATUS_LABELS = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  EXHAUSTED: 'Agotado',
} as const;

function formatAmount(amount: string): string {
  const num = parseFloat(amount);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(num);
}

export function PlansPageClient({
  plans,
  userRole,
  userLocationId,
  patients,
  companies,
  serviceTypes,
  locations = [],
}: PlansPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanResponse | null>(null);

  const currentStatus = searchParams.get('status') ?? '';
  const currentCompanyId = searchParams.get('companyId') ?? '';

  const hasMultiplePages = plans.total > plans.limit;

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handleEdit = (plan: PlanResponse) => {
    setSelectedPlan(plan);
    setDrawerOpen(true);
  };

  const handleNewPlan = () => {
    setSelectedPlan(null);
    setDrawerOpen(true);
  };

  const handleDelete = async (plan: PlanResponse) => {
    const confirmed = window.confirm(
      `¿Eliminar el plan de "${plan.patientName}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    await deletePlanAction(plan.id);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">
            Planes de Beneficio
          </h1>
          <p className="text-secondary text-sm mt-1">
            Gestiona los planes de tratamiento de tus pacientes
          </p>
        </div>
        <Button variant="gradient" onClick={handleNewPlan}>
          + Nuevo Plan
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-status"
            className="text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold whitespace-nowrap"
          >
            Estado
          </label>
          <select
            id="filter-status"
            aria-label="Estado"
            className={SELECT_CLASS}
            value={currentStatus}
            onChange={(e) => updateFilter('status', e.target.value)}
          >
            <option value="">Todos</option>
            {Object.entries(PLAN_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-company"
            className="text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold whitespace-nowrap"
          >
            Empresa
          </label>
          <select
            id="filter-company"
            aria-label="Empresa"
            className={SELECT_CLASS}
            value={currentCompanyId}
            onChange={(e) => updateFilter('companyId', e.target.value)}
          >
            <option value="">Todas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {(currentStatus || currentCompanyId) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              router.push('?');
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Table or empty state */}
      {plans.data.length === 0 ? (
        <EmptyState
          title="Sin planes aún"
          description="Crea el primer plan de tratamiento para comenzar."
          action={
            <Button variant="gradient" onClick={handleNewPlan}>
              + Nuevo Plan
            </Button>
          }
        />
      ) : (
        <>
          <div className="rounded-xl overflow-hidden border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={TABLE_HEAD_CLASS}>Paciente</TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden md:table-cell`}>
                    Empresa
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden lg:table-cell`}>
                    Tipo Servicio
                  </TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Sesiones</TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden md:table-cell`}>
                    Monto
                  </TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Estado</TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} text-right`}>
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.data.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="text-foreground font-medium">
                      {plan.patientName}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                      {plan.companyName ?? (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                      {plan.serviceTypeName ?? (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <PlanProgressBar
                        usedSessions={plan.usedSessions}
                        plannedSessions={plan.plannedSessions}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                      {formatAmount(plan.amount)}
                    </TableCell>
                    <TableCell>
                      <PlanStatusBadge status={plan.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(plan)}
                        >
                          Editar
                        </Button>
                        {plan.status !== 'EXHAUSTED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(plan)}
                          >
                            Eliminar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {hasMultiplePages && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-secondary">
                Página {plans.page} de {Math.ceil(plans.total / plans.limit)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => goToPage(plans.page - 1)}
                  disabled={plans.page <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goToPage(plans.page + 1)}
                  disabled={plans.page * plans.limit >= plans.total}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <PlanDrawer
        open={drawerOpen}
        plan={selectedPlan}
        onClose={() => setDrawerOpen(false)}
        patients={patients}
        companies={companies}
        serviceTypes={serviceTypes}
        locations={locations}
        userRole={userRole}
        userLocationId={userLocationId}
      />
    </div>
  );
}
