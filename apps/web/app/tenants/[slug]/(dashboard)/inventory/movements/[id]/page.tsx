import { notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { fetchInventoryMovementAction } from '@/app/actions/inventory-movements';
import { MovementDetailClient } from './movement-detail-client';
import { Button } from '@/components/ui/button';

export default async function MovementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    notFound();
  }

  try {
    const movement = await fetchInventoryMovementAction(id);

    return <MovementDetailClient movement={movement} />;
  } catch {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-muted-foreground">Movimiento no encontrado.</p>
        <Button variant="outline" onClick={() => window.history.back()}>
          Volver
        </Button>
        <a href="/inventory/movements" className="text-primary hover:underline">
          Ver todos los movimientos
        </a>
      </div>
    );
  }
}
