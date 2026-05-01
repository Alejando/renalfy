import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface CashCloseFilters {
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

interface CreateCashCloseInput {
  date: string | Date;
}

interface ErrorResponse {
  message?: string;
}

export const useCashCloses = (filters?: CashCloseFilters) => {
  const queryParams = new URLSearchParams();
  if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);
  if (filters?.page) queryParams.append('page', String(filters.page));
  if (filters?.limit) queryParams.append('limit', String(filters.limit));

  return useQuery({
    queryKey: ['cashCloses', filters],
    queryFn: async () => {
      const res = await fetch(`/api/cash-closes?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch cash closes');
      return res.json();
    },
  });
};

export const useCreateCashClose = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCashCloseInput) => {
      const res = await fetch('/api/cash-closes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = (await res.json()) as ErrorResponse;
        throw new Error(error.message || 'Failed to create cash close');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashCloses'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
};
