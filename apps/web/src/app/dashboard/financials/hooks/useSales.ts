import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface SalesFilters {
  dateFrom?: string;
  dateTo?: string;
  clientId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const useSales = (filters?: SalesFilters) => {
  const queryParams = new URLSearchParams();
  if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);
  if (filters?.clientId) queryParams.append('clientId', filters.clientId);
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.page) queryParams.append('page', String(filters.page));
  if (filters?.limit) queryParams.append('limit', String(filters.limit));

  return useQuery({
    queryKey: ['sales', filters],
    queryFn: async () => {
      const res = await fetch(`/api/sales?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch sales');
      return res.json();
    },
  });
};

interface CreateSaleInput {
  clientId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  paymentType: 'CASH' | 'CREDIT' | 'DEBIT' | 'TRANSFER';
}

interface ErrorResponse {
  message?: string;
}

export const useCreateSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSaleInput) => {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = (await res.json()) as ErrorResponse;
        throw new Error(error.message || 'Failed to create sale');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};

export const useCancelSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (saleId: string) => {
      const res = await fetch(`/api/sales/${saleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (!res.ok) throw new Error('Failed to cancel sale');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};
