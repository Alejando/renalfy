import { z } from 'zod';

export const ExpenseTypeSchema = z.enum([
  'PAYROLL',
  'SUPPLIES',
  'UTILITIES',
  'MAINTENANCE',
  'OTHER',
]);

export const ExpenseStatusSchema = z.enum(['ACTIVE', 'CANCELLED']);

export const CreateExpenseSchema = z.object({
  locationId: z.string().uuid(),
  type: ExpenseTypeSchema,
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  customType: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

export const ExpenseResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  locationId: z.string().uuid(),
  type: ExpenseTypeSchema,
  customType: z.string().nullable(),
  amount: z.string(),
  description: z.string().nullable(),
  status: ExpenseStatusSchema,
  isClosed: z.boolean(),
  userId: z.string().uuid(),
  createdAt: z.coerce.date(),
  cancelledAt: z.coerce.date().nullable(),
  closedAt: z.coerce.date().nullable(),
});

export const ExpenseQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  status: ExpenseStatusSchema.optional(),
  type: ExpenseTypeSchema.optional(),
  locationId: z.string().uuid().optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const PaginatedExpenseResponseSchema = z.object({
  data: z.array(ExpenseResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export type ExpenseType = z.infer<typeof ExpenseTypeSchema>;
export type ExpenseStatus = z.infer<typeof ExpenseStatusSchema>;
export type CreateExpenseDto = z.infer<typeof CreateExpenseSchema>;
export type ExpenseResponse = z.infer<typeof ExpenseResponseSchema>;
export type ExpenseQuery = z.infer<typeof ExpenseQuerySchema>;
export type PaginatedExpenseResponse = z.infer<
  typeof PaginatedExpenseResponseSchema
>;
