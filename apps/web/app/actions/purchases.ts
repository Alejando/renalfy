'use server';

import { revalidatePath } from 'next/cache';
import type { FormData as FormDataType } from 'form-data';
import { apiFetch } from '../../lib/api';

export async function receivePurchaseAction(
  prevState: unknown,
  formData: FormData
): Promise<{ error: string } | null> {
  try {
    const purchaseOrderId = formData.get('purchaseOrderId') as string;
    const locationId = formData.get('locationId') as string;
    const itemsJson = formData.get('items') as string;
    const notes = formData.get('notes') as string | null;

    const items = JSON.parse(itemsJson);

    const payload = {
      purchaseOrderId,
      locationId,
      items,
      notes: notes ?? undefined,
    };

    await apiFetch('/purchases', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    revalidatePath('/inventory/purchase-orders');
    revalidatePath('/inventory/purchases');
    revalidatePath('/inventory/movements');

    return null;
  } catch (error) {
    if (error instanceof Response) {
      if (error.status === 409) {
        return { error: 'Orden modificada por otro usuario. Actualiza la página e intenta de nuevo.' };
      }
    }
    return {
      error: error instanceof Error ? error.message : 'Error al registrar recepción',
    };
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
