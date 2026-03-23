'use client';

import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CompanyResponse, PaginatedCompaniesResponse, UserRole } from '@repo/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '../../../../components/empty-state';
import { CompanyDrawer } from './company-drawer';
import { deleteCompanyAction } from '../../../../actions/companies';

interface CompaniesPageClientProps {
  companies: PaginatedCompaniesResponse;
  userRole: UserRole;
}

const TABLE_HEAD_CLASS =
  'text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

export function CompaniesPageClient({
  companies,
  userRole,
}: CompaniesPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyResponse | null>(null);
  const [searchValue, setSearchValue] = useState(searchParams.get('search') ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canManage = userRole === 'OWNER' || userRole === 'ADMIN';

  const hasMultiplePages = companies.total > companies.limit;

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set('search', value);
      } else {
        params.delete('search');
      }
      params.set('page', '1');
      router.push(`?${params.toString()}`);
    }, 300);
  };

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handleEdit = (company: CompanyResponse) => {
    setSelectedCompany(company);
    setDrawerOpen(true);
  };

  const handleNewCompany = () => {
    setSelectedCompany(null);
    setDrawerOpen(true);
  };

  const handleDelete = async (company: CompanyResponse) => {
    const confirmed = window.confirm(
      `¿Eliminar la empresa "${company.name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    await deleteCompanyAction(company.id);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">Empresas</h1>
          <p className="text-secondary text-sm mt-1">
            Gestiona las empresas aseguradoras de tu clínica
          </p>
        </div>
        {canManage && (
          <Button variant="gradient" onClick={handleNewCompany}>
            + Nueva Empresa
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <Input
          type="text"
          placeholder="Buscar empresa..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Table or empty state */}
      {companies.data.length === 0 ? (
        <EmptyState
          title="Sin empresas aún"
          description="Crea la primera empresa para comenzar."
          action={
            canManage ? (
              <Button variant="gradient" onClick={handleNewCompany}>
                + Nueva Empresa
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="rounded-xl overflow-hidden border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={TABLE_HEAD_CLASS}>Empresa</TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden md:table-cell`}>
                    RFC
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden lg:table-cell`}>
                    Contacto
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden lg:table-cell`}>
                    Teléfono
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} text-right`}>
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.data.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="text-foreground font-medium">
                      {company.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                      {company.taxId ?? <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                      {company.contactPerson ?? (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                      {company.phone ?? <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(company)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(company)}
                        >
                          Eliminar
                        </Button>
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
                Página {companies.page} de{' '}
                {Math.ceil(companies.total / companies.limit)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => goToPage(companies.page - 1)}
                  disabled={companies.page <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goToPage(companies.page + 1)}
                  disabled={companies.page * companies.limit >= companies.total}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <CompanyDrawer
        open={drawerOpen}
        company={selectedCompany}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
