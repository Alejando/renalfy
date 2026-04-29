'use server';

import { revalidatePath } from 'next/cache';
import { ReceivePurchaseOrderSchema } from '@repo/types';
import { apiFetch } from '../../lib/api';

export async function receivePurchaseAction(
  prevState: unknown,
  formData: FormData
): Promise<{ error: string } | null> {
  try {
    const purchaseOrderId = formData.get('purchaseOrderId') as string;
    const locationId = formData.get('locationId') as string;
    const itemsJson = formData.get('items') as string;
    const notes = (formData.get('notes') as string) || undefined;

    const items = JSON.parse(itemsJson);

    const payload = {
      purchaseOrderId,
      locationId,
      items,
      ...(notes ? { notes } : {}),
    };

    const result = ReceivePurchaseOrderSchema.safeParse(payload);
    if (!result.success) {
      return {
        error: result.error.issues[0]?.message ?? 'Datos inválidos',
      };
    }

    await apiFetch('/purchases', {
      method: 'POST',
      body: JSON.stringify(result.data),
    });

    revalidatePath('/inventory/purchase-orders');
    revalidatePath('/inventory/purchases');
    revalidatePath('/inventory/movements');

    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error al registrar recepción';
    if (errorMessage.includes('409')) {
      return { error: 'Orden modificada por otro usuario. Actualiza la página e intenta de nuevo.' };
    }
    return { error: errorMessage };
  }
}

export async function closePurchaseOrderAction(id: string): Promise<{ error: string } | null> {
  try {
    await apiFetch(`/purchase-orders/${id}/close`, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    revalidatePath('/inventory/purchase-orders');
    revalidatePath(`/inventory/purchase-orders/${id}`);

    return null;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Error al cerrar orden',
    };
  }
}
