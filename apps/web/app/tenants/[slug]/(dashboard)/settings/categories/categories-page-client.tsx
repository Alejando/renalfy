'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '../../../../../components/empty-state';
import { createCategoryAction, deleteCategoryAction } from '../../../../../actions/product-categories';

interface CategoryOption {
  id: string;
  name: string;
  createdAt: string;
}

interface CategoriesPageClientProps {
  categories: CategoryOption[];
}

const TABLE_HEAD_CLASS =
  'text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

const LABEL_CLASS =
  'block text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

const FormSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
});

type FormValues = z.infer<typeof FormSchema>;

export function CategoriesPageClient({ categories }: CategoriesPageClientProps) {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { name: '' },
  });

  const handleCreate = async (data: FormValues) => {
    setServerError(null);
    const formData = new FormData();
    formData.append('name', data.name);

    const result = await createCategoryAction(null, formData);
    if (result?.error) {
      setServerError(result.error);
      return;
    }

    reset();
    setShowCreateForm(false);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!showDeleteDialog) return;
    setServerError(null);
    const result = await deleteCategoryAction(showDeleteDialog);
    if (result?.error) {
      setServerError(result.error);
      setShowDeleteDialog(null);
      return;
    }
    setShowDeleteDialog(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">Categorías</h1>
          <p className="text-secondary text-sm mt-1">
            Gestiona las categorías de productos de tu clínica
          </p>
        </div>
        <Button variant="gradient" onClick={() => setShowCreateForm(true)}>
          + Nueva Categoría
        </Button>
      </div>

      {/* Error message */}
      {serverError && (
        <div className="p-3 bg-destructive/10 rounded-lg">
          <p className="text-destructive text-sm font-medium">{serverError}</p>
        </div>
      )}

      {/* Create form */}
      {showCreateForm && (
        <div className="rounded-xl border p-4">
          <form
            aria-label="Nueva categoría"
            onSubmit={handleSubmit(handleCreate)}
            className="space-y-3"
          >
            <div className="space-y-2">
              <Label htmlFor="category-name" className={LABEL_CLASS}>
                Nombre de Categoría <span className="text-destructive">*</span>
              </Label>
              <Input
                id="category-name"
                aria-label="Nombre de Categoría"
                placeholder="Ej: Material de diálisis"
                autoFocus
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="gradient"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creando…' : 'Crear Categoría'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  reset();
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Table or empty state */}
      {categories.length === 0 ? (
        <EmptyState
          title="Sin categorías aún"
          description="Crea la primera categoría para organizar tus productos."
          action={
            <Button variant="gradient" onClick={() => setShowCreateForm(true)}>
              + Nueva Categoría
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl overflow-hidden border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={TABLE_HEAD_CLASS}>Categoría</TableHead>
                <TableHead className={`${TABLE_HEAD_CLASS} hidden md:table-cell`}>
                  Fecha de creación
                </TableHead>
                <TableHead className={`${TABLE_HEAD_CLASS} text-right`}>
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="text-foreground font-medium">
                    {category.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                    {new Date(category.createdAt).toLocaleDateString('es-MX')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setShowDeleteDialog(category.id)}
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
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={showDeleteDialog !== null}
        onOpenChange={() => setShowDeleteDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la categoría. No se puede deshacer.
              Si la categoría tiene productos asignados, se rechazará la eliminación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
