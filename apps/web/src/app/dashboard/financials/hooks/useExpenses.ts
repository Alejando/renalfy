import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ExpenseFilters {
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  page?: number;
  limit?: number;
}

interface CreateExpenseInput {
  date: string | Date;
  type: 'PAYROLL' | 'SUPPLIES' | 'UTILITIES' | 'MAINTENANCE' | 'OTHER';
  amount: number;
  description: string;
}

interface ErrorResponse {
  message?: string;
}

export const useExpenses = (filters?: ExpenseFilters) => {
  const queryParams = new URLSearchParams();
  if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);
  if (filters?.type) queryParams.append('type', filters.type);
  if (filters?.page) queryParams.append('page', String(filters.page));
  if (filters?.limit) queryParams.append('limit', String(filters.limit));

  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: async () => {
      const res = await fetch(`/api/expenses?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch expenses');
      return res.json();
    },
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateExpenseInput) => {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = (await res.json()) as ErrorResponse;
        throw new Error(error.message || 'Failed to create expense');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
};

export const useCancelExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (expenseId: string) => {
      const res = await fetch(`/api/expenses/${expenseId}/cancel`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to cancel expense');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
};
