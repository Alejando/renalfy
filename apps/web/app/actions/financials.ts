'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '../../lib/api';

// --- Response Types ---
interface SaleResponse {
  id: string;
  tenantId: string;
  locationId: string;
  folio: string;
  totalAmount: string;
  paymentType: string;
  status: 'ACTIVE' | 'CANCELLED' | 'FINISHED' | 'SETTLED';
  isClosed: boolean;
  userId: string;
  notes: string | null;
  createdAt: string;
  finishedAt: string | null;
  settledAt: string | null;
  closedAt: string | null;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: string;
    tax: string;
    subtotal: string;
    createdAt: string;
  }>;
}

interface IncomeResponse {
  id: string;
  tenantId: string;
  locationId: string;
  type: string;
  customType: string | null;
  amount: string;
  description: string | null;
  status: string;
  isClosed: boolean;
  userId: string;
  createdAt: string;
  cancelledAt: string | null;
  closedAt: string | null;
}

interface ExpenseResponse {
  id: string;
  tenantId: string;
  locationId: string;
  type: string;
  customType: string | null;
  amount: string;
  description: string | null;
  status: string;
  isClosed: boolean;
  userId: string;
  createdAt: string;
  cancelledAt: string | null;
  closedAt: string | null;
}

interface CashCloseResponse {
  id: string;
  tenantId: string;
  locationId: string;
  date: string;
  status: string;
  calculatedTotal: string;
  salesTotal: string;
  incomesTotal: string;
  expensesTotal: string;
  userId: string;
  createdAt: string;
  closedAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  page: number;
}

interface ActionResult {
  error?: string;
}

// --- Fetch Actions (for Server Components) ---

export async function fetchSalesAction(filters?: {
  dateFrom?: string;
  dateTo?: string;
  clientId?: string;
  status?: string;
}): Promise<PaginatedResponse<SaleResponse>> {
  const params = new URLSearchParams();
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  if (filters?.clientId) params.set('clientId', filters.clientId);
  if (filters?.status) params.set('status', filters.status);

  const queryString = params.toString();
  return apiFetch<PaginatedResponse<SaleResponse>>(
    `/sales${queryString ? `?${queryString}` : ''}`,
  );
}

export async function fetchIncomesAction(filters?: {
  dateFrom?: string;
  dateTo?: string;
  type?: string;
}): Promise<PaginatedResponse<IncomeResponse>> {
  const params = new URLSearchParams();
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  if (filters?.type) params.set('type', filters.type);

  const queryString = params.toString();
  return apiFetch<PaginatedResponse<IncomeResponse>>(
    `/incomes${queryString ? `?${queryString}` : ''}`,
  );
}

export async function fetchExpensesAction(filters?: {
  dateFrom?: string;
  dateTo?: string;
  type?: string;
}): Promise<PaginatedResponse<ExpenseResponse>> {
  const params = new URLSearchParams();
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  if (filters?.type) params.set('type', filters.type);

  const queryString = params.toString();
  return apiFetch<PaginatedResponse<ExpenseResponse>>(
    `/expenses${queryString ? `?${queryString}` : ''}`,
  );
}

export async function fetchCashClosesAction(filters?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<PaginatedResponse<CashCloseResponse>> {
  const params = new URLSearchParams();
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);

  const queryString = params.toString();
  return apiFetch<PaginatedResponse<CashCloseResponse>>(
    `/cash-closes${queryString ? `?${queryString}` : ''}`,
  );
}

export async function fetchSaleDetailAction(id: string): Promise<SaleResponse> {
  return apiFetch<SaleResponse>(`/sales/${id}`);
}

export async function fetchIncomeDetailAction(id: string): Promise<IncomeResponse> {
  return apiFetch<IncomeResponse>(`/incomes/${id}`);
}

export async function fetchExpenseDetailAction(id: string): Promise<ExpenseResponse> {
  return apiFetch<ExpenseResponse>(`/expenses/${id}`);
}

export async function fetchCashCloseDetailAction(id: string): Promise<CashCloseResponse> {
  return apiFetch<CashCloseResponse>(`/cash-closes/${id}`);
}

// --- Mutation Actions ---

interface CreateSaleInput {
  locationId: string;
  clientId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  paymentType: 'CASH' | 'CREDIT' | 'DEBIT' | 'TRANSFER' | 'BENEFIT';
  notes?: string;
}

export async function createSaleAction(data: CreateSaleInput): Promise<ActionResult> {
  try {
    await apiFetch<SaleResponse>('/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    revalidatePath('/', 'layout');
    return {};
  } catch (e: unknown) {
    return {
      error: e instanceof Error ? e.message : 'Error al crear la venta',
    };
  }
}

export async function cancelSaleAction(id: string): Promise<ActionResult> {
  try {
    await apiFetch<SaleResponse>(`/sales/${id}/cancel`, {
      method: 'PATCH',
    });
    revalidatePath('/', 'layout');
    return {};
  } catch (e: unknown) {
    return {
      error: e instanceof Error ? e.message : 'Error al cancelar la venta',
    };
  }
}

interface CreateIncomeInput {
  locationId: string;
  date: string;
  type: string;
  amount: string;
  description?: string;
}

export async function createIncomeAction(data: CreateIncomeInput): Promise<ActionResult> {
  try {
    await apiFetch<IncomeResponse>('/incomes', {
      method: 'POST',
      body: JSON.stringify({
        locationId: data.locationId,
        type: data.type,
        amount: data.amount,
        description: data.description,
      }),
    });
    revalidatePath('/', 'layout');
    return {};
  } catch (e: unknown) {
    return {
      error: e instanceof Error ? e.message : 'Error al crear el ingreso',
    };
  }
}

export async function cancelIncomeAction(id: string): Promise<ActionResult> {
  try {
    await apiFetch<IncomeResponse>(`/incomes/${id}/cancel`, {
      method: 'PATCH',
    });
    revalidatePath('/', 'layout');
    return {};
  } catch (e: unknown) {
    return {
      error: e instanceof Error ? e.message : 'Error al cancelar el ingreso',
    };
  }
}

interface CreateExpenseInput {
  locationId: string;
  date: string;
  type: string;
  amount: string;
  description?: string;
}

export async function createExpenseAction(data: CreateExpenseInput): Promise<ActionResult> {
  try {
    await apiFetch<ExpenseResponse>('/expenses', {
      method: 'POST',
      body: JSON.stringify({
        locationId: data.locationId,
        type: data.type,
        amount: data.amount,
        description: data.description,
      }),
    });
    revalidatePath('/', 'layout');
    return {};
  } catch (e: unknown) {
    return {
      error: e instanceof Error ? e.message : 'Error al crear el egreso',
    };
  }
}

export async function cancelExpenseAction(id: string): Promise<ActionResult> {
  try {
    await apiFetch<ExpenseResponse>(`/expenses/${id}/cancel`, {
      method: 'PATCH',
    });
    revalidatePath('/', 'layout');
    return {};
  } catch (e: unknown) {
    return {
      error: e instanceof Error ? e.message : 'Error al cancelar el egreso',
    };
  }
}

interface CreateCashCloseInput {
  locationId: string;
  date: string;
}

export async function createCashCloseAction(data: CreateCashCloseInput): Promise<ActionResult> {
  try {
    await apiFetch<CashCloseResponse>('/cash-closes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    revalidatePath('/', 'layout');
    return {};
  } catch (e: unknown) {
    return {
      error: e instanceof Error ? e.message : 'Error al crear el corte de caja',
    };
  }
}
