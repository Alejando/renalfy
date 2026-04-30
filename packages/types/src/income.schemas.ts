import { z } from 'zod';

export const IncomeTypeSchema = z.enum([
  'SERVICE_FEE',
  'DEPOSIT',
  'TRANSFER',
  'REFUND',
  'OTHER',
]);

export const IncomeStatusSchema = z.enum(['ACTIVE', 'CANCELLED']);

export const CreateIncomeSchema = z.object({
  locationId: z.string().uuid(),
  type: IncomeTypeSchema,
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  customType: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

export const IncomeResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  locationId: z.string().uuid(),
  type: IncomeTypeSchema,
  customType: z.string().nullable(),
  amount: z.string(),
  description: z.string().nullable(),
  status: IncomeStatusSchema,
  isClosed: z.boolean(),
  userId: z.string().uuid(),
  createdAt: z.coerce.date(),
  cancelledAt: z.coerce.date().nullable(),
  closedAt: z.coerce.date().nullable(),
});

export const IncomeQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  status: IncomeStatusSchema.optional(),
  type: IncomeTypeSchema.optional(),
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

export const PaginatedIncomeResponseSchema = z.object({
  data: z.array(IncomeResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export type IncomeType = z.infer<typeof IncomeTypeSchema>;
export type IncomeStatus = z.infer<typeof IncomeStatusSchema>;
export type CreateIncomeDto = z.infer<typeof CreateIncomeSchema>;
export type IncomeResponse = z.infer<typeof IncomeResponseSchema>;
export type IncomeQuery = z.infer<typeof IncomeQuerySchema>;
export type PaginatedIncomeResponse = z.infer<
  typeof PaginatedIncomeResponseSchema
>;
