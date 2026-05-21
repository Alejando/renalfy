import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface IncomeFilters {
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  page?: number;
  limit?: number;
}

interface CreateIncomeInput {
  date: string | Date;
  type: 'SALES_OTHER' | 'REFUND' | 'OTHER';
  amount: number;
  description: string;
}

interface ErrorResponse {
  message?: string;
}

export const useIncomes = (filters?: IncomeFilters) => {
  const queryParams = new URLSearchParams();
  if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);
  if (filters?.type) queryParams.append('type', filters.type);
  if (filters?.page) queryParams.append('page', String(filters.page));
  if (filters?.limit) queryParams.append('limit', String(filters.limit));

  return useQuery({
    queryKey: ['incomes', filters],
    queryFn: async () => {
      const res = await fetch(`/api/incomes?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch incomes');
      return res.json();
    },
  });
};

export const useCreateIncome = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateIncomeInput) => {
      const res = await fetch('/api/incomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = (await res.json()) as ErrorResponse;
        throw new Error(error.message || 'Failed to create income');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
    },
  });
};

export const useCancelIncome = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (incomeId: string) => {
      const res = await fetch(`/api/incomes/${incomeId}/cancel`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to cancel income');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
    },
  });
};
